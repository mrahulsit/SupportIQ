import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireOwnedBot } from "@/lib/auth";
import { BotTabs } from "./BotTabs";

export default async function BotLayout({ children, params }: LayoutProps<"/dashboard/bots/[id]">) {
  const { id } = await params;
  const { bot } = await requireOwnedBot(id);
  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 pt-5 md:px-8">
        <Link href="/dashboard/bots" className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
          <ChevronLeft className="size-3.5" /> Assistants
        </Link>
        <div className="flex items-center gap-3">
          <span className="size-3 rounded-full" style={{ background: bot.brandColor }} />
          <h1 className="text-xl font-semibold tracking-tight">{bot.name}</h1>
        </div>
        <BotTabs id={bot.id} />
      </div>
      {children}
    </>
  );
}
