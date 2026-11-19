import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Info, Lightbulb } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { publicOrigin } from "@/lib/origin";
import { setupSteps } from "@/lib/setup";
import { SetupChecklist } from "./SetupChecklist";
import { db } from "@/lib/db";
import { getOverview, type Overview } from "@/lib/analytics";
import { knowledgeGaps } from "@/lib/ai/copilot";
import { Badge, PageHeader } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);

export default async function OverviewPage() {
  const user = await requireUser();
  const bots = await db.bot.findMany({ where: { ownerId: user.id }, select: { id: true, name: true } });
  const [o, gaps, urgent] = await Promise.all([
    getOverview(user.id, 14),
    knowledgeGaps(bots.map((b) => b.id), 6),
    db.conversation.findMany({
      where: { bot: { ownerId: user.id }, status: { in: ["NEEDS_HUMAN", "HUMAN"] } },
      orderBy: [{ priority: "desc" }, { lastMessageAt: "desc" }],
      take: 5,
      include: { bot: { select: { name: true } } },
    }),
  ]);
  const botName = new Map(bots.map((b) => [b.id, b.name]));
  const steps = await setupSteps(user.id, await publicOrigin());

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`How your assistants performed over the last ${o.days} days.`}
      />
      <div className="space-y-6 p-4 md:p-8">
        <SetupChecklist steps={steps} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Conversations" value={o.total.toLocaleString()} hint={`${o.open} open with your team`} help="Chats started in the last 14 days." />
          <Stat label="AI containment" value={pct(o.containment)} hint="Solved without a human" help="Share of chats the AI handled on its own, without being handed to your team." />
          <Stat label="Answer helpfulness" value={pct(o.helpfulRate)} hint="Thumbs up on AI answers" help="Of the AI answers visitors rated, the share they marked as helpful." />
          <Stat
            label="Satisfaction (CSAT)"
            value={o.csat ? `${o.csat.toFixed(1)} / 5` : "—"}
            hint={`${o.csatCount} ratings · ${o.avgLatencyMs ? `${(o.avgLatencyMs / 1000).toFixed(1)}s avg reply` : "no replies yet"}`}
            help="Average star rating visitors give when they end a chat."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="card p-5 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Conversations per day</h2>
              <Legend items={[{ label: "Handled by AI", color: "var(--series-1)" }, { label: "Escalated to a human", color: "var(--series-2)" }]} />
            </div>
            <DailyChart series={o.series} />
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Top topics</h2>
            <CategoryBars categories={o.categories} />
            <h2 className="mb-3 mt-6 font-semibold">Customer sentiment</h2>
            <SentimentBar sentiments={o.sentiments} />
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold">Waiting on your team</h2>
              <Link href="/dashboard/inbox?status=open" className="btn-ghost text-xs">
                Open inbox <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {urgent.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No conversations need a human right now.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {urgent.map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/inbox/${c.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{c.summary ?? "New conversation"}</p>
                        <p className="text-xs text-slate-500">
                          {c.bot.name} · {timeAgo(c.lastMessageAt)}
                        </p>
                      </div>
                      <Badge value={c.priority} />
                      <Badge value={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <Lightbulb className="size-4 text-amber-500" /> Knowledge gaps
              </h2>
              <span className="text-xs text-slate-500">Questions the AI couldn’t answer</span>
            </div>
            {gaps.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No gaps yet — your knowledge base is covering everything asked.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {gaps.map((g) => (
                  <li key={g.conversationId + g.question} className="flex items-center gap-3 px-5 py-3">
                    <p className="min-w-0 flex-1 truncate text-sm">“{g.question}”</p>
                    <Link href={`/dashboard/bots/${g.botId}/knowledge`} className="shrink-0 text-xs font-medium text-indigo-600 hover:underline">
                      Fix in {botName.get(g.botId)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint, help }: { label: string; value: string; hint: string; help: string }) {
  return (
    <div className="card p-4" title={help}>
      <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
        {label} <Info className="size-3 text-slate-400" aria-label={help} />
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-slate-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Stacked daily bars: AI-handled (bottom) + escalated (top). Native <title> gives a hover tooltip per day. */
function DailyChart({ series }: { series: Overview["series"] }) {
  const max = Math.max(4, ...series.map((d) => d.total));
  const ticks = [0, Math.round(max / 2), max];
  const W = 640;
  const H = 200;
  const padL = 28;
  const padB = 22;
  const plotH = H - padB - 8;
  const slot = (W - padL) / series.length;
  const barW = Math.min(28, slot * 0.6);
  const y = (v: number) => (v / max) * plotH;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Conversations per day, split into AI-handled and escalated">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={8 + plotH - y(t)} y2={8 + plotH - y(t)} stroke="#e2e8f0" strokeDasharray={t === 0 ? undefined : "3 3"} />
            <text x={padL - 6} y={8 + plotH - y(t) + 3} textAnchor="end" className="fill-slate-400 text-[10px]">
              {t}
            </text>
          </g>
        ))}
        {series.map((d, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const ai = d.total - d.escalated;
          const hAi = y(ai);
          const hEsc = y(d.escalated);
          const base = 8 + plotH;
          const label = new Date(d.day).toLocaleDateString("en", { month: "short", day: "numeric" });
          return (
            <g key={d.day}>
              <title>{`${label}: ${d.total} conversations (${ai} AI, ${d.escalated} escalated)`}</title>
              <rect x={padL + i * slot} y={8} width={slot} height={plotH} fill="transparent" />
              {ai > 0 && <rect x={x} y={base - hAi} width={barW} height={hAi} rx={d.escalated ? 0 : 4} fill="var(--series-1)" />}
              {d.escalated > 0 && <rect x={x} y={base - hAi - hEsc - (ai > 0 ? 2 : 0)} width={barW} height={hEsc} rx={4} fill="var(--series-2)" />}
              {(i % 2 === series.length % 2 || series.length <= 7) && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer">View as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-slate-400">
              <th className="py-1 font-medium">Day</th>
              <th className="font-medium">Total</th>
              <th className="font-medium">Escalated</th>
            </tr>
          </thead>
          <tbody>
            {series.map((d) => (
              <tr key={d.day} className="border-t border-slate-100">
                <td className="py-1">{d.day}</td>
                <td>{d.total}</td>
                <td>{d.escalated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function CategoryBars({ categories }: { categories: Overview["categories"] }) {
  if (categories.length === 0) return <p className="text-sm text-slate-500">Topics appear once conversations are triaged.</p>;
  const max = Math.max(...categories.map((c) => c.count));
  return (
    <ul className="space-y-2.5">
      {categories.slice(0, 6).map((c) => (
        <li key={c.label} title={`${c.label}: ${c.count}`}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="capitalize text-slate-700">{c.label}</span>
            <span className="tabular-nums text-slate-500">{c.count}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: "var(--series-1)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SentimentBar({ sentiments }: { sentiments: Overview["sentiments"] }) {
  const total = sentiments.reduce((s, x) => s + x.count, 0);
  if (!total) return <p className="text-sm text-slate-500">No sentiment data yet.</p>;
  const order = [
    { key: "NEGATIVE", label: "Negative", color: "var(--div-neg)" },
    { key: "NEUTRAL", label: "Neutral", color: "var(--div-mid)" },
    { key: "POSITIVE", label: "Positive", color: "var(--div-pos)" },
  ];
  const parts = order.map((o) => ({ ...o, count: sentiments.find((s) => s.label === o.key)?.count ?? 0 }));
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {parts.filter((p) => p.count).map((p) => (
          <div key={p.key} title={`${p.label}: ${p.count}`} style={{ width: `${(p.count / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <span className="tabular-nums text-slate-400">{Math.round((p.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
