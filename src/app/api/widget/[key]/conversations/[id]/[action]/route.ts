import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { triageConversation } from "@/lib/ai/triage";
import { VisitorId, getBotByKey, getVisitorConversation, json } from "@/lib/widget";

const Handoff = z.object({ visitorId: VisitorId });
const Feedback = z.object({ visitorId: VisitorId, messageId: z.string().max(64), value: z.union([z.literal(1), z.literal(-1)]) });
const End = z.object({ visitorId: VisitorId, csat: z.number().int().min(1).max(5).optional() });

/** Visitor actions: POST …/handoff | …/feedback | …/end */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/widget/[key]/conversations/[id]/[action]">) {
  const { key, id, action } = await ctx.params;
  const body = await req.json().catch(() => null);
  const bot = await getBotByKey(key);
  if (!bot) return json({ error: "Unknown bot" }, { status: 404 });

  const visitor = VisitorId.safeParse(body?.visitorId);
  if (!visitor.success) return json({ error: "Invalid visitor" }, { status: 400 });
  const convo = await getVisitorConversation(bot.id, id, visitor.data);
  if (!convo) return json({ error: "Not found" }, { status: 404 });

  switch (action) {
    case "handoff": {
      if (!Handoff.safeParse(body).success) break;
      if (!bot.handoffEnabled) return json({ error: "Handoff is disabled" }, { status: 400 });
      if (convo.status === "AI") {
        await db.conversation.update({
          where: { id: convo.id },
          data: { status: "NEEDS_HUMAN", escalatedAt: convo.escalatedAt ?? new Date() },
        });
        await db.message.create({ data: { conversationId: convo.id, role: "SYSTEM", content: "Visitor clicked “Talk to a human”." } });
        await db.message.create({
          data: {
            conversationId: convo.id,
            role: "ASSISTANT",
            content: "I've notified the team — a teammate will pick this up and reply here.",
            model: "handoff",
          },
        });
        after(() => triageConversation(convo.id).catch(console.error));
      }
      return json({ status: "NEEDS_HUMAN" });
    }

    case "feedback": {
      const p = Feedback.safeParse(body);
      if (!p.success) break;
      const updated = await db.message.updateMany({
        where: { id: p.data.messageId, conversationId: convo.id, role: "ASSISTANT" },
        data: { feedback: p.data.value },
      });
      return json({ ok: updated.count === 1 });
    }

    case "end": {
      const p = End.safeParse(body);
      if (!p.success) break;
      const agentReplies = await db.message.count({ where: { conversationId: convo.id, role: "AGENT" } });
      await db.conversation.update({
        where: { id: convo.id },
        data: {
          status: "RESOLVED",
          resolvedAt: convo.resolvedAt ?? new Date(),
          resolvedBy: convo.resolvedBy ?? (agentReplies > 0 ? "AGENT" : "AI"),
          csat: p.data.csat ?? convo.csat,
        },
      });
      return json({ status: "RESOLVED" });
    }

    default:
      return json({ error: "Unknown action" }, { status: 404 });
  }
  return json({ error: "Invalid request" }, { status: 400 });
}
