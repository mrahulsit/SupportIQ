import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { chatLimiter } from "@/lib/rate-limit";
import { aiEnabled, chatModel, stream } from "@/lib/ai/openrouter";
import { buildAnswerMessages } from "@/lib/ai/prompts";
import { CONFIDENCE_THRESHOLD, searchKnowledge } from "@/lib/ai/retrieval";
import { extractiveAnswer } from "@/lib/ai/heuristics";
import { wantsHuman } from "@/lib/ai/text";
import { triageConversation } from "@/lib/ai/triage";
import { VisitorId, clientIp, getBotByKey, getVisitorConversation, json } from "@/lib/widget";

export const maxDuration = 60;

const Body = z.object({
  visitorId: VisitorId,
  conversationId: z.string().max(64).optional(),
  message: z.string().trim().min(1).max(2000),
  pageUrl: z.string().url().max(500).optional(),
});

const encoder = new TextEncoder();
const sse = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

/**
 * Visitor chat endpoint. Streams the assistant reply as Server-Sent Events:
 *   meta  → { conversationId, status }
 *   token → { t }                      (text deltas)
 *   done  → { messageId, sources, unanswered, status }
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/widget/[key]/chat">) {
  const { key } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
  const { visitorId, conversationId, message, pageUrl } = parsed.data;

  const limit = chatLimiter.check(`${clientIp(req)}:${visitorId}`);
  if (!limit.ok) {
    return json(
      { error: "You're sending messages too quickly. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  const bot = await getBotByKey(key);
  if (!bot) return json({ error: "Unknown bot" }, { status: 404 });

  let convo = conversationId ? await getVisitorConversation(bot.id, conversationId, visitorId) : null;
  if (!convo || convo.status === "RESOLVED") {
    convo = await db.conversation.create({ data: { botId: bot.id, visitorId, pageUrl } });
  }

  const history = await db.message.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "asc" },
    take: 30,
  });
  await db.message.create({ data: { conversationId: convo.id, role: "USER", content: message } });
  await db.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } });

  const conversation = convo;
  const userTurns = history.filter((m) => m.role === "USER").length + 1;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(sse(event, data));
      const started = Date.now();
      try {
        send("meta", { conversationId: conversation.id, status: conversation.status });

        // A human owns this conversation: store the message and let the agent reply.
        if (conversation.status === "NEEDS_HUMAN" || conversation.status === "HUMAN") {
          send("done", { messageId: null, sources: [], unanswered: false, status: conversation.status });
          return;
        }

        // Explicit request for a person → hand off without calling the model.
        if (bot.handoffEnabled && wantsHuman(message)) {
          const text = "Sure — I've let the team know and a teammate will reply right here. You can keep this window open or come back later.";
          const saved = await handoff(conversation.id, text);
          send("token", { t: text });
          send("done", { messageId: saved.id, sources: [], unanswered: false, status: "NEEDS_HUMAN" });
          return;
        }

        const { chunks, confidence } = await searchKnowledge(bot.id, message);
        const relevant = confidence >= CONFIDENCE_THRESHOLD ? chunks : [];
        const sources = relevant.map((c, i) => ({
          n: i + 1,
          title: c.title,
          url: c.sourceUrl,
          snippet: c.content.slice(0, 220),
        }));

        let text = "";
        let model = "extractive";
        if (aiEnabled()) {
          try {
            for await (const delta of stream(buildAnswerMessages(bot, history, relevant, message), { signal: req.signal })) {
              text += delta;
              send("token", { t: delta });
            }
            model = chatModel();
          } catch (err) {
            // Model outage / free-tier rate limit: fall back to an extractive answer.
            console.warn("[chat] model failed, using extractive fallback:", (err as Error).message);
            if (text) text += "\n\n";
          }
        }
        if (model === "extractive") {
          const fallback = extractiveAnswer(message, relevant);
          text += fallback;
          send("token", { t: fallback });
        }

        // Keep only the sources the reply actually cites (fall back to all if it cites none).
        const cited = new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
        const usedSources = cited.size ? sources.filter((s) => cited.has(s.n)) : sources;

        const saved = await db.message.create({
          data: {
            conversationId: conversation.id,
            role: "ASSISTANT",
            content: text.trim(),
            sources: usedSources,
            confidence,
            unanswered: relevant.length === 0,
            latencyMs: Date.now() - started,
            model,
          },
        });
        send("done", { messageId: saved.id, sources: usedSources, unanswered: saved.unanswered, status: "AI" });
      } catch (err) {
        console.error("[chat] failed", err);
        send("error", { error: "Something went wrong. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  // Background AI triage (first turns, then every third turn) after the response is sent.
  if (userTurns <= 2 || userTurns % 3 === 0) {
    after(() => triageConversation(conversation.id).catch((e) => console.error("[triage]", e)));
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function handoff(conversationId: string, text: string) {
  await db.conversation.update({
    where: { id: conversationId },
    data: { status: "NEEDS_HUMAN", escalatedAt: new Date() },
  });
  await db.message.create({ data: { conversationId, role: "SYSTEM", content: "Visitor asked for a human." } });
  return db.message.create({ data: { conversationId, role: "ASSISTANT", content: text, model: "handoff" } });
}
