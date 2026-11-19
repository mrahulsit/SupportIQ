import type { Metadata } from "next";
import { BookOpenCheck, FileText, Globe, Lightbulb, RefreshCw, Trash2 } from "lucide-react";
import { requireOwnedBot } from "@/lib/auth";
import { db } from "@/lib/db";
import { knowledgeGaps } from "@/lib/ai/copilot";
import { Badge, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { deleteDocument, reindexDocument } from "../../../actions";
import { AddDocumentForms } from "./AddDocumentForms";
import { GapArticle } from "./GapArticle";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata: Metadata = { title: "Knowledge base" };

export default async function KnowledgePage({ params }: PageProps<"/dashboard/bots/[id]/knowledge">) {
  const { id } = await params;
  const { bot } = await requireOwnedBot(id);
  const [docs, gaps] = await Promise.all([
    db.document.findMany({
      where: { botId: bot.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, sourceType: true, sourceUrl: true, status: true, error: true, chunkCount: true, createdAt: true },
    }),
    knowledgeGaps([bot.id], 15),
  ]);
  const processing = docs.some((d) => d.status === "PROCESSING");
  const ownDocs = docs.filter((d) => d.title !== "Getting started").length;

  return (
    <div className="grid gap-6 p-4 md:p-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      {processing && <AutoRefresh every={2500} />}
      <div className="space-y-6">
        <AddDocumentForms botId={bot.id} />

        <section className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold">Sources</h2>
            <span className="text-xs text-slate-500">
              {docs.length} documents · {docs.reduce((s, d) => s + d.chunkCount, 0)} indexed passages
            </span>
          </div>
          {docs.length === 0 ? (
            <EmptyState icon={<FileText className="size-5" />} title="No knowledge yet">
              Add a help article or a page URL so the assistant has something to answer from.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    {d.sourceType === "URL" ? <Globe className="size-4" /> : <FileText className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {d.status === "FAILED" ? <span className="text-rose-600">{d.error}</span> : `${d.chunkCount} passages · added ${timeAgo(d.createdAt)}`}
                      {d.sourceUrl && <> · {d.sourceUrl}</>}
                    </p>
                  </div>
                  <Badge value={d.status} />
                  <form action={reindexDocument.bind(null, bot.id, d.id)}>
                    <button aria-label="Re-index" title="Re-index" className="btn-ghost p-1.5">
                      <RefreshCw className="size-4" />
                    </button>
                  </form>
                  <form action={deleteDocument.bind(null, bot.id, d.id)}>
                    <button aria-label="Delete" title="Delete" className="btn-danger p-1.5">
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <section className={`card p-5 ${ownDocs === 0 ? "ring-indigo-300" : ""}`}>
          <h2 className="flex items-center gap-2 font-semibold">
            <BookOpenCheck className="size-4 text-indigo-600" /> What to add
          </h2>
          {ownDocs === 0 && (
            <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
              Only the starter article is here, so the assistant can’t answer questions about your business yet. Add a few sources to get started.
            </p>
          )}
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><b className="text-slate-800">Your FAQ</b> — the questions customers ask most.</li>
            <li><b className="text-slate-800">Policies</b> — shipping, returns, refunds, privacy.</li>
            <li><b className="text-slate-800">Product & pricing</b> — plans, features, limits.</li>
            <li><b className="text-slate-800">How-to guides</b> — setup and troubleshooting steps.</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Tip: one topic per source, written in the words customers use. The assistant only answers from what’s here, so it never makes up policies.
          </p>
        </section>

        <section className="card">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Lightbulb className="size-4 text-amber-500" /> Knowledge gaps
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Questions the assistant couldn’t answer from these sources.</p>
          </div>
          {gaps.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-500">Nothing missing so far.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {gaps.map((g) => (
                <li key={g.conversationId + g.question} className="px-5 py-2.5 text-sm">
                  “{g.question}” <span className="text-xs text-slate-400">· {timeAgo(g.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {gaps.length > 0 && <GapArticle botId={bot.id} />}
        </section>
      </aside>
    </div>
  );
}
