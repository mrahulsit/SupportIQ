import "server-only";
import { db } from "@/lib/db";
import { aiEnabled, complete } from "./openrouter";
import { buildArticleMessages, buildDraftMessages, transcriptOf } from "./prompts";
import { searchKnowledge } from "./retrieval";
import { extractiveAnswer } from "./heuristics";

/** Drafts the next reply for a human agent, grounded in the knowledge base. */
export async function draftAgentReply(conversationId: string): Promise<string> {
  const convo = await db.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { bot: true, messages: { orderBy: { createdAt: "asc" }, take: 40 } },
  });
  const lastQuestion = [...convo.messages].reverse().find((m) => m.role === "USER")?.content ?? "";
  const { chunks } = await searchKnowledge(convo.botId, lastQuestion, 4);

  if (aiEnabled()) {
    try {
      return await complete(buildDraftMessages(convo.bot.name, transcriptOf(convo.messages), chunks), {
        temperature: 0.4,
        maxTokens: 400,
      });
    } catch (err) {
      console.warn("[copilot] draft failed, falling back:", (err as Error).message);
    }
  }
  const body = chunks.length
    ? extractiveAnswer(lastQuestion, chunks).replace(/\s*\[\d\]/g, "")
    : "Could you share a few more details so I can look into this for you?";
  return `Thanks for your patience! ${body}`;
}

/** Recent questions the assistant could not answer for a bot (knowledge gaps). */
export async function knowledgeGaps(botIds: string[], limit = 20) {
  if (botIds.length === 0) return [];
  const rows = await db.$queryRaw<{ question: string; botId: string; createdAt: Date; conversationId: string }[]>`
    SELECT DISTINCT ON (lower(q.content)) q.content AS question, c."botId", m."createdAt", c.id AS "conversationId"
    FROM "Message" m
    JOIN "Conversation" c ON c.id = m."conversationId"
    JOIN LATERAL (
      SELECT u.content FROM "Message" u
      WHERE u."conversationId" = m."conversationId" AND u.role = 'USER' AND u."createdAt" <= m."createdAt"
      ORDER BY u."createdAt" DESC LIMIT 1
    ) q ON true
    WHERE m.unanswered = true AND c."botId" = ANY(${botIds})
    ORDER BY lower(q.content), m."createdAt" DESC`;
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}

/** Writes a draft help article covering the bot's knowledge gaps. */
export async function suggestArticle(botName: string, questions: string[]): Promise<string> {
  if (aiEnabled()) {
    try {
      return await complete(buildArticleMessages(botName, questions), { temperature: 0.5, maxTokens: 1200 });
    } catch (err) {
      console.warn("[copilot] article draft failed, falling back:", (err as Error).message);
    }
  }
  return [
    `# Frequently asked questions`,
    "",
    ...questions.flatMap((q) => [`## ${q}`, "", "[TODO: write the answer]", ""]),
  ].join("\n");
}
