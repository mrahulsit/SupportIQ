"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bot, CheckCircle2, ChevronLeft, Loader2, RefreshCw, Send, Sparkles, Star, ThumbsDown, ThumbsUp, UserRound } from "lucide-react";
import { Markdown } from "@/components/chat/Markdown";
import { Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { generateDraft, retriage, sendAgentReply, setConversationStatus } from "../../actions";

type Conversation = {
  id: string;
  botName: string;
  botId: string;
  status: "AI" | "NEEDS_HUMAN" | "HUMAN" | "RESOLVED";
  summary: string | null;
  category: string | null;
  sentiment: string | null;
  priority: string | null;
  triagedAt: string | null;
  pageUrl: string | null;
  visitorId: string;
  csat: number | null;
  createdAt: string;
};

type Msg = {
  id: string;
  role: "USER" | "ASSISTANT" | "AGENT" | "SYSTEM";
  content: string;
  sources: { n: number; title: string }[];
  confidence: number | null;
  unanswered: boolean;
  feedback: number | null;
  model: string | null;
  latencyMs: number | null;
  agentName: string | null;
  createdAt: string;
};

export function ConversationView({ conversation: c, messages }: { conversation: Conversation; messages: Msg[] }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [drafting, startDrafting] = useTransition();
  const [updating, startUpdating] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send() {
    const text = reply.trim();
    if (!text) return;
    startSending(async () => {
      const res = await sendAgentReply(c.id, text);
      if (res.error) setError(res.error);
      else {
        setReply("");
        setError(null);
        router.refresh();
      }
    });
  }

  function draft() {
    startDrafting(async () => {
      const res = await generateDraft(c.id);
      setReply(res.draft);
    });
  }

  function status(s: "AI" | "HUMAN" | "RESOLVED") {
    startUpdating(async () => {
      await setConversationStatus(c.id, s);
      router.refresh();
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col xl:flex-row">
      {/* Thread */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <Link href="/dashboard/inbox" className="btn-ghost p-1.5 md:hidden" aria-label="Back">
            <ChevronLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">Visitor {c.visitorId.slice(2, 8)}</p>
            <p className="truncate text-xs text-slate-500">
              {c.botName} · started {timeAgo(c.createdAt)}
              {c.pageUrl && <> · on {safeHost(c.pageUrl)}</>}
            </p>
          </div>
          <Badge value={c.status} />
          {c.status !== "HUMAN" && c.status !== "RESOLVED" && (
            <button onClick={() => status("HUMAN")} disabled={updating} className="btn-secondary text-xs">
              <UserRound className="size-3.5" /> Take over
            </button>
          )}
          {(c.status === "HUMAN" || c.status === "NEEDS_HUMAN") && (
            <button onClick={() => status("AI")} disabled={updating} className="btn-secondary text-xs">
              <Bot className="size-3.5" /> Hand back to AI
            </button>
          )}
          {c.status !== "RESOLVED" ? (
            <button onClick={() => status("RESOLVED")} disabled={updating} className="btn-secondary text-xs">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Resolve
            </button>
          ) : (
            <button onClick={() => status("HUMAN")} disabled={updating} className="btn-secondary text-xs">
              Reopen
            </button>
          )}
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5 md:px-8">
          {messages.map((m) =>
            m.role === "SYSTEM" ? (
              <p key={m.id} className="text-center text-[11px] text-slate-400">
                — {m.content} · {timeAgo(m.createdAt)} —
              </p>
            ) : (
              <div key={m.id} className={`flex ${m.role === "USER" ? "justify-start" : "justify-end"}`}>
                <div className="max-w-[80%]">
                  <p className={`mb-1 text-[11px] text-slate-500 ${m.role === "USER" ? "" : "text-right"}`}>
                    {m.role === "USER" ? "Visitor" : m.role === "AGENT" ? m.agentName ?? "Agent" : "AI assistant"} · {timeAgo(m.createdAt)}
                  </p>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      m.role === "USER" ? "rounded-bl-md bg-white ring-1 ring-slate-200" : m.role === "AGENT" ? "rounded-br-md bg-emerald-600 text-white" : "rounded-br-md bg-indigo-600 text-white"
                    }`}
                  >
                    {m.role === "USER" ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : <Markdown>{m.content}</Markdown>}
                  </div>
                  {m.role === "ASSISTANT" && (
                    <div className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {m.unanswered && (
                        <span className="flex items-center gap-1 text-amber-700">
                          <AlertTriangle className="size-3" /> Knowledge gap
                        </span>
                      )}
                      {m.confidence != null && <span>confidence {Math.round(m.confidence * 100)}%</span>}
                      {m.sources.length > 0 && <span>sources: {m.sources.map((s) => `[${s.n}] ${s.title}`).join(", ")}</span>}
                      {m.latencyMs != null && <span>{(m.latencyMs / 1000).toFixed(1)}s</span>}
                      {m.model && m.model !== "handoff" && <span className="font-mono">{m.model}</span>}
                      {m.feedback === 1 && <ThumbsUp className="size-3 text-emerald-600" />}
                      {m.feedback === -1 && <ThumbsDown className="size-3 text-rose-600" />}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
          <div ref={bottom} />
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200 bg-white p-3 md:px-6">
          {c.status === "RESOLVED" ? (
            <p className="py-2 text-center text-sm text-slate-500">This conversation is resolved. Reopen it to reply.</p>
          ) : (
            <>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                }}
                rows={3}
                placeholder={c.status === "AI" ? "Reply as an agent — this takes the conversation over from the AI" : "Write a reply…"}
                className="input resize-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={draft} disabled={drafting} className="btn-secondary">
                  {drafting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-indigo-600" />}
                  {reply ? "Redraft with AI" : "Draft reply with AI"}
                </button>
                <span className="hidden text-xs text-slate-400 sm:inline">Ctrl + Enter to send</span>
                <button onClick={send} disabled={sending || !reply.trim()} className="btn-primary ml-auto">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            </>
          )}
        </div>
      </div>

      {/* AI triage panel */}
      <aside className="order-first max-h-56 shrink-0 space-y-4 overflow-y-auto border-b border-slate-200 bg-white p-5 xl:order-none xl:max-h-none xl:w-72 xl:border-b-0 xl:border-l">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-indigo-600" /> AI triage
          </h2>
          <button
            onClick={() => startUpdating(async () => { await retriage(c.id); router.refresh(); })}
            disabled={updating}
            className="btn-ghost p-1.5"
            aria-label="Re-run triage"
            title="Re-run triage"
          >
            <RefreshCw className={`size-3.5 ${updating ? "animate-spin" : ""}`} />
          </button>
        </div>
        {c.triagedAt ? (
          <>
            <div>
              <p className="text-xs font-medium text-slate-500">Summary</p>
              <p className="mt-1 text-sm leading-relaxed">{c.summary}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Priority</dt>
                <dd className="mt-1"><Badge value={c.priority} /></dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Sentiment</dt>
                <dd className="mt-1"><Badge value={c.sentiment} /></dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Topic</dt>
                <dd className="mt-1 capitalize">{c.category}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">CSAT</dt>
                <dd className="mt-1 flex items-center gap-1">
                  {c.csat ? (
                    <>
                      {c.csat} <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
            <p className="text-[11px] text-slate-400">Updated {timeAgo(c.triagedAt)}</p>
          </>
        ) : (
          <p className="text-sm text-slate-500">Triage runs automatically after the visitor’s first message.</p>
        )}
      </aside>
    </div>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
