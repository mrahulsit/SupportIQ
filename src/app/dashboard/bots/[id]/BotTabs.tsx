"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BotTabs({ id }: { id: string }) {
  const path = usePathname();
  const tabs = [
    { href: `/dashboard/bots/${id}`, label: "Install" },
    { href: `/dashboard/bots/${id}/knowledge`, label: "Knowledge base" },
    { href: `/dashboard/bots/${id}/settings`, label: "Settings" },
  ];
  return (
    <nav className="-mb-px mt-4 flex gap-5 overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`shrink-0 border-b-2 pb-2.5 text-sm font-medium transition ${
            path === t.href ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
