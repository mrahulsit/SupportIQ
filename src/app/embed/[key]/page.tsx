import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getBotByKey } from "@/lib/widget";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };

export default async function EmbedPage({ params, searchParams }: PageProps<"/embed/[key]">) {
  const { key } = await params;
  const { page, preview } = await searchParams;
  const bot = await getBotByKey(key);
  if (!bot) notFound();

  const pageUrl = typeof page === "string" && /^https?:\/\//.test(page) ? page.slice(0, 500) : undefined;

  return (
    <main className="fixed inset-0 flex">
      <ChatWidget
        botKey={bot.publicKey}
        mode={preview === "1" ? "preview" : "embed"}
        pageUrl={pageUrl}
        config={{
          name: bot.name,
          greeting: bot.greeting,
          brandColor: bot.brandColor,
          handoffEnabled: bot.handoffEnabled,
          starters: bot.starters,
        }}
      />
    </main>
  );
}
