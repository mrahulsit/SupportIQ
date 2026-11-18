import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { aiEnabled, complete } from "./openrouter";
import { buildTriageMessages, transcriptOf } from "./prompts";
import { extractJson } from "./text";
import { heuristicTriage, type Triage } from "./heuristics";

const TriageSchema = z.object({
  summary: z.string().min(1).max(600),
  category: z.enum(["billing", "technical", "account", "sales", "feedback", "other"]).catch("other"),
  sentiment: z.enum(["positive", "neutral", "negative"]).catch("neutral"),
  priority: z.enum(["low", "medium", "high", "urgent"]).catch("medium"),
  needs_human: z.boolean().catch(false),
});

/**
 * Classifies a conversation (summary, category, sentiment, priority) and
 * escalates it to the human queue when the model says it needs a person.
 * Runs after the response is sent, so it never slows the visitor down.
 */
export async function triageConversation(conversationId: string) {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { bot: true, messages: { orderBy: { createdAt: "asc" }, take: 40 } },
  });
  if (!convo || convo.messages.length === 0) return;

  const customerMessages = convo.messages.filter((m) => m.role === "USER").map((m) => m.content);
  let result: Triage | null = null;

  if (aiEnabled()) {
    try {
      const { text: raw } = await complete(buildTriageMessages(transcriptOf(convo.messages)), {
        temperature: 0,
        maxTokens: 300,
      });
      const parsed = TriageSchema.safeParse(extractJson(raw));
      if (parsed.success) result = parsed.data;
      else console.warn("[triage] invalid JSON from model, using heuristics");
    } catch (err) {
      console.warn("[triage] model call failed, using heuristics:", (err as Error).message);
    }
  }
  result ??= heuristicTriage(customerMessages.join("\n"), customerMessages[0] ?? "");

  const escalate = result.needs_human && convo.status === "AI" && convo.bot.handoffEnabled;

  await db.conversation.update({
    where: { id: convo.id },
    data: {
      summary: result.summary,
      category: result.category,
      sentiment: result.sentiment.toUpperCase() as "POSITIVE" | "NEUTRAL" | "NEGATIVE",
      priority: result.priority.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      triagedAt: new Date(),
      ...(escalate ? { status: "NEEDS_HUMAN", escalatedAt: convo.escalatedAt ?? new Date() } : {}),
    },
  });

  if (escalate) {
    await db.message.create({
      data: {
        conversationId: convo.id,
        role: "SYSTEM",
        content: "Auto-escalated by AI triage: the customer seems to need a human.",
      },
    });
  }
}
