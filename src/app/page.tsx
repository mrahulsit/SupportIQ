import Link from "next/link";
import Script from "next/script";
import { ArrowRight, BookOpen, Code2, Gauge, Headset, Lightbulb, ShieldCheck, Sparkles, Tags } from "lucide-react";
import { Logo } from "@/components/Logo";
import { DEMO_BOT_KEY } from "@/lib/demo";

const features = [
  { icon: BookOpen, title: "Answers from your docs (RAG)", body: "Hybrid search — pgvector semantic similarity fused with Postgres full-text — grounds every reply in your knowledge base, with inline citations." },
  { icon: Tags, title: "Automatic triage", body: "Each conversation is summarised and labelled with topic, sentiment and priority by an LLM, so the inbox sorts itself." },
  { icon: Headset, title: "Human handoff", body: "Visitors can ask for a person at any time, and frustrated or blocked customers are escalated to your team automatically." },
  { icon: Sparkles, title: "Agent copilot", body: "One click drafts a grounded reply for the human agent. They edit, send, and the visitor sees it live in the widget." },
  { icon: Lightbulb, title: "Knowledge-gap loop", body: "Questions the AI couldn’t answer are collected and turned into a draft help article you can publish in one step." },
  { icon: ShieldCheck, title: "Built to embed safely", body: "Iframe isolation, CSP frame-ancestors per site, server-side model calls, rate limiting and sanitised markdown." },
];

export default function Home() {
  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,.14),transparent)]" />
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
            <Sparkles className="size-3.5" /> AI customer support, one script tag away
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
            Support that answers <span className="text-indigo-600">from your docs</span> — and knows when to call a human.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            SupportIQ adds an AI assistant to any website, grounds its answers in your knowledge base, triages every conversation and gives your team an
            inbox with an AI copilot.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-primary px-5 py-2.5">
              Create a free workspace <ArrowRight className="size-4" />
            </Link>
            <Link href="/login?demo=1" className="btn-secondary px-5 py-2.5">
              Explore the demo dashboard
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            👉 Try the live widget — the chat button in the bottom-right corner is SupportIQ running on this page.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Install in one line</h2>
            <p className="mt-3 text-slate-300">
              The loader is a few KB of vanilla JavaScript. The chat runs in an isolated iframe, so it can’t clash with your site’s CSS or JS — and updates
              ship without you redeploying.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2"><Code2 className="size-4 text-indigo-400" /> Works with HTML, WordPress, Webflow, React, Next.js…</li>
              <li className="flex gap-2"><Gauge className="size-4 text-indigo-400" /> Streams replies token-by-token over Server-Sent Events</li>
              <li className="flex gap-2"><ShieldCheck className="size-4 text-indigo-400" /> Only the sites you allow can embed your assistant</li>
            </ul>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-white/5 p-5 font-mono text-sm leading-relaxed ring-1 ring-white/10">
            <code>
              <span className="text-slate-500">{"<!-- before </body> -->"}</span>
              {"\n"}
              <span className="text-sky-300">{"<script"}</span> <span className="text-indigo-300">src</span>=
              <span className="text-emerald-300">&quot;https://your-host/widget.js&quot;</span>
              {"\n        "}
              <span className="text-indigo-300">data-bot</span>=<span className="text-emerald-300">&quot;siq_your_key&quot;</span>{" "}
              <span className="text-indigo-300">async</span>
              <span className="text-sky-300">{"></script>"}</span>
            </code>
          </pre>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
        <Logo />
        <p>Next.js · PostgreSQL + pgvector · Prisma · OpenRouter</p>
      </footer>

      {/* Dogfooding: the landing page embeds its own widget exactly like a customer site would. */}
      <Script src="/widget.js" data-bot={DEMO_BOT_KEY} strategy="afterInteractive" />
    </div>
  );
}
