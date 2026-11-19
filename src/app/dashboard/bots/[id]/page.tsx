import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, CircleDashed, ExternalLink, ShieldCheck } from "lucide-react";
import { requireOwnedBot } from "@/lib/auth";
import { publicOrigin } from "@/lib/origin";
import { installedOn } from "@/lib/setup";
import { timeAgo } from "@/lib/utils";
import { InstallGuide } from "@/components/InstallGuide";
import { DownloadTestPage } from "./DownloadTestPage";

export const metadata: Metadata = { title: "Install" };

export default async function BotInstallPage({ params }: PageProps<"/dashboard/bots/[id]">) {
  const { id } = await params;
  const { bot } = await requireOwnedBot(id);
  const origin = await publicOrigin();
  const hosts = await installedOn([bot.id], origin);

  return (
    <div className="grid gap-6 p-4 md:p-8 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-6">
        {/* Status */}
        <section className={`card flex items-start gap-3 p-5 ${hosts.length ? "ring-emerald-200" : ""}`}>
          {hosts.length ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          ) : (
            <CircleDashed className="mt-0.5 size-5 shrink-0 text-slate-400" />
          )}
          <div className="min-w-0">
            <p className="font-semibold">{hosts.length ? "Installed and receiving chats" : "Not detected on a website yet"}</p>
            {hosts.length ? (
              <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
                {hosts.map((h) => (
                  <li key={h.host}>
                    <b className="font-medium text-slate-800">{h.host}</b> · last chat {timeAgo(h.lastSeen)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-600">Follow the steps below. Once a visitor opens a chat on your site, it will show up here.</p>
            )}
          </div>
        </section>

        <Step n={1} title="Copy the snippet for your platform">
          <InstallGuide origin={origin} botKey={bot.publicKey} />
          <p className="hint mt-2">
            Your bot key is <code className="rounded bg-slate-100 px-1 font-mono">{bot.publicKey}</code>. Optional attributes:{" "}
            <code>data-position=&quot;left&quot;</code>, <code>data-color=&quot;#hex&quot;</code>.
          </p>
        </Step>

        <Step n={2} title="Test it before going live">
          <p className="text-sm text-slate-600">Open a blank page that loads the widget exactly like your website will, or download one to run locally.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/test/${bot.publicKey}`} target="_blank" className="btn-primary">
              Open test page <ExternalLink className="size-4" />
            </Link>
            <DownloadTestPage origin={origin} botKey={bot.publicKey} botName={bot.name} />
          </div>
        </Step>

        <Step n={3} title="Choose where it may appear (optional)">
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-indigo-600" />
            <p>
              {bot.allowedOrigins.length ? (
                <>
                  Only these sites can show your assistant: <b className="text-slate-800">{bot.allowedOrigins.join(", ")}</b>. On any other site the chat
                  panel shows “The chat couldn’t load”.
                </>
              ) : (
                <>Right now any website can show your assistant — handy while testing. When you go live, list your domains so nobody else can embed it.</>
              )}{" "}
              <Link href={`/dashboard/bots/${bot.id}/settings#allowed-websites`} className="font-medium text-indigo-600 hover:underline">
                Edit allowed websites
              </Link>
            </p>
          </div>
        </Step>

        <details className="card group p-5">
          <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
            Troubleshooting <span className="ml-1 text-slate-400 group-open:hidden">+</span>
          </summary>
          <ul className="mt-3 space-y-3 text-sm text-slate-600">
            <li>
              <b className="text-slate-800">No chat button:</b> make sure the script is on the page you’re viewing and check the browser console — SupportIQ logs a
              message if the bot key is wrong.
            </li>
            <li>
              <b className="text-slate-800">“The chat couldn’t load”:</b> the site isn’t in Allowed websites. Add its address (e.g. https://www.example.com) or
              clear the list while testing.
            </li>
            <li>
              <b className="text-slate-800">Answers are “I don’t know”:</b> add the missing content in the{" "}
              <Link href={`/dashboard/bots/${bot.id}/knowledge`} className="font-medium text-indigo-600 hover:underline">
                Knowledge base
              </Link>
              .
            </li>
          </ul>
        </details>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <p className="mb-2 text-sm font-medium text-slate-700">Live preview</p>
        <div className="h-[620px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200">
          <iframe src={`/embed/${bot.publicKey}?preview=1`} title="Widget preview" className="size-full" />
        </div>
        <p className="hint">This is the real assistant — chats here appear in your inbox.</p>
      </aside>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2.5 font-semibold">
        <span className="grid size-6 place-items-center rounded-full bg-indigo-600 text-xs text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
