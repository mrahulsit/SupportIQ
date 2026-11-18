import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ConversationList, type ListItem } from "./ConversationList";

const PRIORITY_RANK = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const conversations = await db.conversation.findMany({
    where: { bot: { ownerId: user.id } },
    orderBy: { lastMessageAt: "desc" },
    take: 150,
    include: {
      bot: { select: { name: true, brandColor: true } },
      messages: { where: { role: "USER" }, orderBy: { createdAt: "desc" }, take: 1, select: { content: true } },
      _count: { select: { messages: true } },
    },
  });

  const items: ListItem[] = conversations
    .map((c) => ({
      id: c.id,
      botName: c.bot.name,
      brandColor: c.bot.brandColor,
      status: c.status,
      priority: c.priority,
      sentiment: c.sentiment,
      category: c.category,
      summary: c.summary,
      preview: c.messages[0]?.content ?? "",
      lastMessageAt: c.lastMessageAt.toISOString(),
      messageCount: c._count.messages,
    }))
    // Needs-human first, then by priority, then most recent.
    .sort((a, b) => {
      const w = (s: string) => (s === "NEEDS_HUMAN" ? 0 : s === "HUMAN" ? 1 : s === "AI" ? 2 : 3);
      return (
        w(a.status) - w(b.status) ||
        (PRIORITY_RANK[a.priority ?? "LOW"] ?? 3) - (PRIORITY_RANK[b.priority ?? "LOW"] ?? 3) ||
        b.lastMessageAt.localeCompare(a.lastMessageAt)
      );
    });

  return (
    <div className="flex flex-col md:h-screen md:min-h-[600px] md:flex-row">
      <AutoRefresh every={4000} />
      <ConversationList items={items} />
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
