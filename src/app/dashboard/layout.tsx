import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiEnabled, chatModel } from "@/lib/ai/openrouter";
import { Logo } from "@/components/Logo";
import { logOut } from "../(auth)/actions";
import { NavLinks } from "./NavLinks";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const waiting = await db.conversation.count({ where: { bot: { ownerId: user.id }, status: "NEEDS_HUMAN" } });

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:px-5">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>
        <NavLinks waiting={waiting} />
        <div className="mt-auto hidden space-y-3 border-t border-slate-200 p-4 md:block">
          <div className={`rounded-lg px-3 py-2 text-xs ${aiEnabled() ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
            {aiEnabled() ? (
              <>
                <b>AI: live</b> · {chatModel()}
              </>
            ) : (
              <>
                <b>AI: offline demo mode</b> — add <code>OPENROUTER_API_KEY</code> for LLM answers
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <form action={logOut}>
              <button aria-label="Log out" className="btn-ghost p-2">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
