import type { Metadata } from "next";
import { requireOwnedBot } from "@/lib/auth";
import { BotSettingsForm } from "../BotSettingsForm";
import { deleteBot } from "../../../actions";

export const metadata: Metadata = { title: "Assistant settings" };

export default async function BotSettingsPage({ params }: PageProps<"/dashboard/bots/[id]/settings">) {
  const { id } = await params;
  const { bot } = await requireOwnedBot(id);

  return (
    <div className="grid gap-6 p-4 md:p-8 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-6">
        <BotSettingsForm bot={bot} />

        <section className="card p-5 ring-rose-200">
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
          {/* key forces a reload after saving so the preview shows the new settings */}
          <iframe key={bot.updatedAt.toISOString()} src={`/embed/${bot.publicKey}?preview=1`} title="Widget preview" className="size-full" />
        </div>
        <p className="hint">Save to see changes here.</p>
      </aside>
    </div>
  );
}
