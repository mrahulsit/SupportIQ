"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export type ListItem = {
  id: string;
  botName: string;
  brandColor: string;
  status: "AI" | "NEEDS_HUMAN" | "HUMAN" | "RESOLVED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  category: string | null;
  summary: string | null;
  preview: string;
  lastMessageAt: string;
  messageCount: number;
};

const FILTERS = [
  { key: "open", label: "Needs attention", match: (i: ListItem) => i.status === "NEEDS_HUMAN" || i.status === "HUMAN" },
  { key: "ai", label: "AI", match: (i: ListItem) => i.status === "AI" },
  { key: "resolved", label: "Resolved", match: (i: ListItem) => i.status === "RESOLVED" },
  { key: "all", label: "All", match: () => true },
];

export function ConversationList({ items }: { items: ListItem[] }) {
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const filter = FILTERS.find((f) => f.key === params.get("status")) ?? FILTERS[3];
  const selected = path.split("/")[3];
  const query = q.trim().toLowerCase();
  const shown = items.filter(
    (i) => filter.match(i) && (!query || `${i.summary} ${i.preview} ${i.category} ${i.botName}`.toLowerCase().includes(query)),
  );

  return (
    <div className={`flex w-full shrink-0 flex-col border-r border-slate-200 bg-white md:w-72 lg:w-80 2xl:w-96 ${selected ? "hidden md:flex" : "flex"}`}>
      <div className="space-y-3 border-b border-slate-200 p-4">
        <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" className="input pl-8" />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const count = items.filter(f.match).length;
            return (
              <button
                key={f.key}
                onClick={() => router.replace(`${path}?status=${f.key}`)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${filter.key === f.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {f.label} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {shown.length === 0 && <li className="p-8 text-center text-sm text-slate-500">No conversations here.</li>}
        {shown.map((i) => (
          <li key={i.id}>
            <Link
              href={`/dashboard/inbox/${i.id}?status=${filter.key}`}
              className={`block px-4 py-3 transition ${selected === i.id ? "bg-indigo-50" : "hover:bg-slate-50"}`}
            >
              <div className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: i.brandColor }} title={i.botName} />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{i.summary ?? i.preview ?? "New conversation"}</p>
                <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(i.lastMessageAt)}</span>
              </div>
              <p className="mt-0.5 line-clamp-1 pl-4 text-xs text-slate-500">{i.preview}</p>
              <div className="mt-1.5 flex flex-wrap gap-1 pl-4">
                <Badge value={i.status} />
                <Badge value={i.priority} />
                {i.sentiment === "NEGATIVE" && <Badge value="NEGATIVE" />}
                {i.category && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] capitalize text-slate-600">{i.category}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
