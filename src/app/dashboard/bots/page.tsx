import Link from "next/link";
import type { Metadata } from "next";
import { Bot, FileText, MessagesSquare, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { createBot } from "../actions";

export const metadata: Metadata = { title: "Assistants" };

export default async function BotsPage() {
  const user = await requireUser();
  const bots = await db.bot.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { documents: true, conversations: true } } },
  });

  return (
    <>
      <PageHeader
        title="Assistants"
        description="Use one assistant per website or brand. Each has its own knowledge base, look and embed code — open one to install it."
      />
      <div className="space-y-6 p-4 md:p-8">
        <form action={createBot} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <input name="name" required minLength={2} maxLength={60} placeholder="New assistant name, e.g. Acme Help" className="input flex-1" />
          <button className="btn-primary justify-center">
            <Plus className="size-4" /> Create assistant
          </button>
        </form>

        {bots.length === 0 ? (
          <div className="card">
            <EmptyState icon={<Bot className="size-5" />} title="No assistants yet">
              Create one above to get an embeddable chat widget.
            </EmptyState>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {bots.map((b) => (
              <Link key={b.id} href={`/dashboard/bots/${b.id}`} className="card group p-5 transition hover:ring-indigo-300">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg text-white" style={{ background: b.brandColor }}>
                    <Bot className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold group-hover:text-indigo-700">{b.name}</p>
                    <p className="truncate font-mono text-xs text-slate-500">{b.publicKey}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <FileText className="size-3.5" /> {b._count.documents} docs
                  </span>
                  <span className="flex items-center gap-1">
                    <MessagesSquare className="size-3.5" /> {b._count.conversations} conversations
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
