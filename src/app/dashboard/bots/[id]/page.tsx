import type { Metadata } from "next";
import { requireOwnedBot } from "@/lib/auth";
import { appUrl } from "@/lib/utils";
import { BotSettingsForm } from "./BotSettingsForm";
import { CopyButton } from "@/components/CopyButton";
import { deleteBot } from "../../actions";

export const metadata: Metadata = { title: "Assistant settings" };

export default async function BotSettingsPage({ params }: PageProps<"/dashboard/bots/[id]">) {
  const { id } = await params;
  const { bot } = await requireOwnedBot(id);
  const snippet = `<script src="${appUrl()}/widget.js" data-bot="${bot.publicKey}" async></script>`;

  return (
    <div className="grid gap-6 p-4 md:p-8 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="font-semibold">Embed on your website</h2>
          <p className="mt-1 text-sm text-slate-500">Paste this before the closing <code>&lt;/body&gt;</code> tag. Works with any stack.</p>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-950 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-slate-100">{snippet}</code>
            <CopyButton text={snippet} />
          </div>
          <p className="hint">
            Optional attributes: <code>data-position=&quot;left&quot;</code>, <code>data-color=&quot;#hex&quot;</code>. Open it from your own code with{" "}
            <code>window.SupportIQ.open()</code>.
          </p>
        </section>

        <BotSettingsForm bot={bot} />

        <section className="card border border-rose-200 p-5">
          <h2 className="font-semibold text-rose-700">Delete assistant</h2>
          <p className="mt-1 text-sm text-slate-500">Removes its knowledge base and all conversations. This can’t be undone.</p>
          <form action={deleteBot.bind(null, bot.id)} className="mt-3">
            <button className="btn-danger ring-1 ring-rose-200">Delete {bot.name}</button>
          </form>
        </section>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <p className="mb-2 text-sm font-medium text-slate-700">Live preview</p>
        <div className="h-[620px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200">
          <iframe src={`/embed/${bot.publicKey}?preview=1`} title="Widget preview" className="size-full" />
        </div>
        <p className="hint">This is the real widget — conversations here show up in your inbox.</p>
      </aside>
    </div>
  );
}
