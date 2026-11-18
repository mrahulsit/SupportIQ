import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser, findOwnedConversation } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConversationView } from "./ConversationView";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/dashboard/inbox/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const convo = await findOwnedConversation(user.id, id);
  if (!convo) notFound();

  const messages = await db.message.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "asc" },
    include: { agent: { select: { name: true } } },
  });

  return (
    <ConversationView
      conversation={{
        id: convo.id,
        botName: convo.bot.name,
        botId: convo.botId,
        status: convo.status,
        summary: convo.summary,
        category: convo.category,
        sentiment: convo.sentiment,
        priority: convo.priority,
        triagedAt: convo.triagedAt?.toISOString() ?? null,
        pageUrl: convo.pageUrl,
        visitorId: convo.visitorId,
        csat: convo.csat,
        createdAt: convo.createdAt.toISOString(),
      }}
      messages={messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: Array.isArray(m.sources) ? (m.sources as { n: number; title: string }[]) : [],
        confidence: m.confidence,
        unanswered: m.unanswered,
        feedback: m.feedback,
        model: m.model,
        latencyMs: m.latencyMs,
        agentName: m.agent?.name ?? null,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
