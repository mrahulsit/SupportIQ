"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, Headset, Sparkles, Star, ThumbsDown, ThumbsUp, UserRound, X } from "lucide-react";
import { Markdown } from "./Markdown";

type Role = "USER" | "ASSISTANT" | "AGENT" | "SYSTEM";
type Source = { n: number; title: string; url: string | null; snippet: string };
type Status = "AI" | "NEEDS_HUMAN" | "HUMAN" | "RESOLVED";
type UIMessage = {
  id: string;
  role: Role;
  content: string;
  sources: Source[];
  unanswered: boolean;
  feedback: number | null;
  agentName: string | null;
  createdAt?: string;
  pending?: boolean;
};

export type WidgetConfig = { name: string; greeting: string; brandColor: string; handoffEnabled: boolean; starters: string[] };

const storage = {
  get(k: string) {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) window.localStorage.removeItem(k);
      else window.localStorage.setItem(k, v);
    } catch {
      /* storage unavailable (private mode / blocked) — chat still works for this session */
    }
  },
};

function newVisitorId() {
  return `v_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function ChatWidget({
  botKey,
  config,
  mode = "embed",
  pageUrl,
}: {
  botKey: string;
  config: WidgetConfig;
  mode?: "embed" | "preview";
  pageUrl?: string;
}) {
  const api = `/api/widget/${encodeURIComponent(botKey)}`;
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<Status>("AI");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [rating, setRating] = useState<"hidden" | "asking" | "done">("hidden");
  const [error, setError] = useState<string | null>(null);

  const cursor = useRef<string | null>(null);
  const known = useRef(new Set<string>());
  const streamingRef = useRef(false);
  const tempSeq = useRef(0);
  const isOpen = useRef(mode === "preview");
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const convoKey = `siq:${botKey}:conversation`;

  const post = useCallback((msg: object) => {
    if (mode === "embed" && window.parent !== window) window.parent.postMessage(msg, "*");
  }, [mode]);

  // --- identity + history restore -------------------------------------------------
  useEffect(() => {
    let id = storage.get("siq:visitor");
    if (!id) {
      id = newVisitorId();
      storage.set("siq:visitor", id);
    }
    // localStorage only exists in the browser, so identity is restored after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitorId(id);
    const savedConvo = storage.get(convoKey);
    if (savedConvo) setConversationId(savedConvo);
  }, [convoKey]);

  const fetchMessages = useCallback(
    async (initial: boolean) => {
      if (!visitorId || !conversationId) return;
      const qs = new URLSearchParams({ visitorId });
      if (!initial && cursor.current) qs.set("after", cursor.current);
      const res = await fetch(`${api}/conversations/${conversationId}?${qs}`, { cache: "no-store" });
      if (res.status === 404) {
        storage.set(convoKey, null);
        setConversationId(null);
        return;
      }
      if (!res.ok || streamingRef.current) return;
      const data: { status: Status; messages: UIMessage[] } = await res.json();
      setStatus(data.status);
      if (data.status === "RESOLVED" && initial) {
        // Previous chat was closed: start fresh.
        storage.set(convoKey, null);
        setConversationId(null);
        setStatus("AI");
        return;
      }
      const fresh = data.messages.filter((m) => !known.current.has(m.id) && (initial || m.role !== "USER"));
      if (data.messages.length) cursor.current = data.messages[data.messages.length - 1].createdAt ?? cursor.current;
      if (fresh.length === 0) return;
      fresh.forEach((m) => known.current.add(m.id));
      setMessages((prev) => (initial ? fresh : [...prev, ...fresh]));
      if (!initial && !isOpen.current) post({ type: "siq:unread", count: fresh.length });
    },
    [api, conversationId, convoKey, post, visitorId],
  );

  useEffect(() => {
    // Restore history once identity is known (state updates happen after the fetch resolves).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (conversationId && messages.length === 0) void fetchMessages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, visitorId]);

  // --- polling for human replies -----------------------------------------------------
  useEffect(() => {
    if (!conversationId || status === "RESOLVED") return;
    const every = status === "AI" ? 10_000 : 3_000;
    const t = setInterval(() => void fetchMessages(false), every);
    return () => clearInterval(t);
  }, [conversationId, status, fetchMessages]);

  // --- parent page messages (open/close state) ------------------------------------
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== window.parent) return;
      if (e.data?.type === "siq:open") {
        isOpen.current = true;
        inputRef.current?.focus();
      }
      if (e.data?.type === "siq:closed") isOpen.current = false;
    }
    window.addEventListener("message", onMessage);
    post({ type: "siq:ready" });
    return () => window.removeEventListener("message", onMessage);
  }, [post]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, rating]);

  // --- sending ------------------------------------------------------------------------
  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming || !visitorId) return;
    setInput("");
    setError(null);
    setRating("hidden");

    const seq = ++tempSeq.current;
    const tempUser: UIMessage = { id: `tmp-u-${seq}`, role: "USER", content: message, sources: [], unanswered: false, feedback: null, agentName: null };
    const humanMode = status === "NEEDS_HUMAN" || status === "HUMAN";
    const tempBot: UIMessage = { id: `tmp-a-${seq}`, role: "ASSISTANT", content: "", sources: [], unanswered: false, feedback: null, agentName: null, pending: true };
    setMessages((prev) => (humanMode ? [...prev, tempUser] : [...prev, tempUser, tempBot]));
    setStreaming(true);
    streamingRef.current = true;

    try {
      const res = await fetch(`${api}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, conversationId: conversationId ?? undefined, message, pageUrl }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't reach the assistant.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const event = raw.match(/^event: (.+)$/m)?.[1];
          const data = JSON.parse(raw.match(/^data: (.+)$/m)?.[1] ?? "{}");
          if (event === "meta") {
            if (data.conversationId !== conversationId) {
              setConversationId(data.conversationId);
              storage.set(convoKey, data.conversationId);
              cursor.current = null; // first poll returns the new thread; known ids are skipped
            }
          } else if (event === "token") {
            setMessages((prev) => prev.map((m) => (m.id === tempBot.id ? { ...m, content: m.content + data.t, pending: false } : m)));
          } else if (event === "done") {
            setStatus(data.status);
            if (data.messageId) known.current.add(data.messageId);
            setMessages((prev) =>
              prev
                .map((m) =>
                  m.id === tempBot.id ? { ...m, id: data.messageId ?? m.id, sources: data.sources ?? [], unanswered: data.unanswered, pending: false } : m,
                )
                .filter((m) => !(m.id === tempBot.id && !m.content)),
            );
          } else if (event === "error") {
            throw new Error(data.error);
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setMessages((prev) => prev.filter((m) => m.id !== tempBot.id || m.content));
    } finally {
      setStreaming(false);
      streamingRef.current = false;
      inputRef.current?.focus();
    }
  }

  async function action(name: "handoff" | "feedback" | "end", extra: object = {}) {
    if (!conversationId || !visitorId) return null;
    const res = await fetch(`${api}/conversations/${conversationId}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, ...extra }),
    });
    return res.ok ? res.json() : null;
  }

  async function requestHuman() {
    const r = await action("handoff");
    if (r) {
      setStatus("NEEDS_HUMAN");
      void fetchMessages(false);
    }
  }

  async function giveFeedback(id: string, value: 1 | -1) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, feedback: value } : m)));
    await action("feedback", { messageId: id, value });
  }

  async function endChat(csat?: number) {
    await action("end", csat ? { csat } : {});
    setRating("done");
    setStatus("RESOLVED");
    storage.set(convoKey, null);
  }

  function startOver() {
    setConversationId(null);
    setMessages([]);
    setStatus("AI");
    setRating("hidden");
    known.current.clear();
    cursor.current = null;
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "ASSISTANT");
  const showHandoff = config.handoffEnabled && status === "AI" && !!conversationId && !streaming;
  const suggestions = [...config.starters.slice(0, 3), ...(config.handoffEnabled ? ["Talk to a human"] : [])];

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white text-slate-900" style={{ ["--brand" as string]: config.brandColor }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: "var(--brand)" }}>
        <div className="grid size-9 place-items-center rounded-full bg-white/20">
          {status === "HUMAN" ? <UserRound className="size-5" /> : <Sparkles className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{config.name}</p>
          <p className="text-xs text-white/80">
            {status === "HUMAN" ? "A teammate is here" : status === "NEEDS_HUMAN" ? "Waiting for a teammate…" : "AI assistant · replies instantly"}
          </p>
        </div>
        {conversationId && status !== "RESOLVED" && rating === "hidden" && (
          <button onClick={() => setRating("asking")} className="rounded-md px-2 py-1 text-xs font-medium text-white/90 hover:bg-white/15">
            End chat
          </button>
        )}
        {mode === "embed" && (
          <button aria-label="Close chat" onClick={() => post({ type: "siq:close" })} className="rounded-md p-1.5 hover:bg-white/15">
            <X className="size-5" />
          </button>
        )}
      </header>

      {/* Messages */}
      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite">
        <Bubble role="ASSISTANT">
          <Markdown>{config.greeting}</Markdown>
        </Bubble>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s) => (
              <button key={s} onClick={() => void send(s)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:border-[var(--brand)] hover:text-[var(--brand)]">
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) =>
          m.role === "SYSTEM" ? null : (
            <div key={m.id} className={m.role === "USER" ? "flex justify-end" : "flex justify-start"}>
              <div className="max-w-[85%] space-y-1.5">
                {m.role === "AGENT" && <p className="pl-1 text-[11px] font-medium text-slate-500">{m.agentName ?? "Support"} · team</p>}
                <Bubble role={m.role}>
                  {m.pending ? <TypingDots /> : m.role === "USER" ? <p className="whitespace-pre-wrap text-[14px]">{m.content}</p> : <Markdown>{m.content}</Markdown>}
                </Bubble>
                {m.role === "ASSISTANT" && m.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-1">
                    {m.sources.map((s) => {
                      const inner = (
                        <>
                          <BookOpen className="size-3" />[{s.n}] {s.title}
                        </>
                      );
                      return s.url ? (
                        <a key={s.n} href={s.url} target="_blank" rel="noopener noreferrer" title={s.snippet} className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:text-[var(--brand)]">
                          {inner}
                        </a>
                      ) : (
                        <span key={s.n} title={s.snippet} className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
                          {inner}
                        </span>
                      );
                    })}
                  </div>
                )}
                {m.role === "ASSISTANT" && !m.pending && !m.id.startsWith("tmp") && m.id === lastAssistant?.id && status === "AI" && (
                  <div className="flex items-center gap-1 pl-1 text-slate-400">
                    <span className="mr-1 text-[11px]">Helpful?</span>
                    <button aria-label="Helpful" onClick={() => void giveFeedback(m.id, 1)} className={`rounded p-1 hover:bg-white ${m.feedback === 1 ? "text-emerald-600" : ""}`}>
                      <ThumbsUp className="size-3.5" />
                    </button>
                    <button aria-label="Not helpful" onClick={() => void giveFeedback(m.id, -1)} className={`rounded p-1 hover:bg-white ${m.feedback === -1 ? "text-rose-600" : ""}`}>
                      <ThumbsDown className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {rating === "asking" && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-sm font-medium">How did we do?</p>
            <div className="mt-2 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} aria-label={`${n} stars`} onClick={() => void endChat(n)} className="rounded p-1 text-amber-400 hover:scale-110">
                  <Star className="size-6 fill-current" />
                </button>
              ))}
            </div>
            <button onClick={() => void endChat()} className="mt-2 text-xs text-slate-500 underline">
              End without rating
            </button>
          </div>
        )}
        {(rating === "done" || (status === "RESOLVED" && messages.length > 0)) && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm shadow-sm">
            <p className="font-medium">Thanks for chatting with us!</p>
            <button onClick={startOver} className="mt-2 rounded-lg px-3 py-1.5 text-xs font-medium text-white" style={{ background: "var(--brand)" }}>
              Start a new conversation
            </button>
          </div>
        )}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white p-3">
        {showHandoff && (
          <button onClick={() => void requestHuman()} className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${lastAssistant?.unanswered ? "bg-amber-50 text-amber-800 ring-amber-200" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
            <Headset className="size-3.5" /> Talk to a human
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-[var(--brand)]"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={status === "RESOLVED" ? "Start a new conversation…" : "Ask a question…"}
            aria-label="Message"
            className="max-h-28 min-h-6 flex-1 resize-none bg-transparent text-[14px] outline-none placeholder:text-slate-400"
          />
          <button type="submit" aria-label="Send" disabled={!input.trim() || streaming} className="grid size-8 shrink-0 place-items-center rounded-lg text-white transition disabled:opacity-40" style={{ background: "var(--brand)" }}>
            <ArrowUp className="size-4" />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-slate-400">Powered by SupportIQ · AI can make mistakes</p>
      </div>
    </div>
  );
}

function Bubble({ role, children }: { role: Role; children: React.ReactNode }) {
  const base = "rounded-2xl px-3.5 py-2.5 shadow-sm";
  if (role === "USER") return <div className={`${base} rounded-br-md text-white`} style={{ background: "var(--brand)" }}>{children}</div>;
  if (role === "AGENT") return <div className={`${base} rounded-bl-md bg-emerald-50 ring-1 ring-emerald-200`}>{children}</div>;
  return <div className={`${base} rounded-bl-md bg-white ring-1 ring-slate-200`}>{children}</div>;
}

function TypingDots() {
  return (
    <span className="flex h-5 items-center gap-1" aria-label="Assistant is typing">
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}
