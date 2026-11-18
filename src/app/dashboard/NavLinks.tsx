"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Inbox, LayoutDashboard } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/bots", label: "Assistants", icon: Bot },
];

export function NavLinks({ waiting }: { waiting: number }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="size-4" />
            {label}
            {label === "Inbox" && waiting > 0 && (
              <span className="ml-auto rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">{waiting}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
