import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBotByKey } from "@/lib/widget";

export const metadata: Metadata = { title: "Widget test page", robots: { index: false } };

/**
 * A blank "customer website" that loads the widget with the real script tag,
 * so owners can check their assistant end-to-end before installing it.
 */
export default async function TestPage({ params }: PageProps<"/test/[key]">) {
  const { key } = await params;
  const bot = await getBotByKey(key);
  if (!bot) notFound();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc,#eef2ff)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Test page</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">This is what your visitors will see</h1>
        <p className="mt-3 text-slate-600">
          This page is a stand-in for your website. It loads <b>{bot.name}</b> with exactly the same script tag you’ll add to your site. Click the chat
          button in the bottom-right corner and ask a question your knowledge base covers.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            ["Ask something you documented", "The answer should cite one of your articles."],
            ["Ask something you didn’t", "It should say it doesn’t know — and the question shows up under Knowledge gaps."],
            ["Ask for a human", "The chat moves to your Inbox as “Needs human”. Reply from there and watch it arrive here."],
            ["End the chat", "Rate it — the score feeds your CSAT on the Overview page."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="font-medium">{t}</p>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 space-y-3" aria-hidden>
          {[92, 80, 86, 64].map((w, i) => (
            <div key={i} className="h-3 rounded-full bg-slate-200/80" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <Script src="/widget.js" data-bot={bot.publicKey} strategy="afterInteractive" />
    </div>
  );
}
