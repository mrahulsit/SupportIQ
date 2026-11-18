"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { Bot } from "@/generated/prisma/browser";
import { updateBot, type FormState } from "../../actions";

export function BotSettingsForm({ bot }: { bot: Bot }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateBot.bind(null, bot.id), undefined);

  return (
    <form action={action} className="card space-y-5 p-5">
      <h2 className="font-semibold">Assistant settings</h2>

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <label>
          <span className="label">Name</span>
          <input name="name" defaultValue={bot.name} required className="input" />
        </label>
        <label>
          <span className="label">Brand colour</span>
          <input name="brandColor" type="color" defaultValue={bot.brandColor} className="h-9 w-full cursor-pointer rounded-lg ring-1 ring-slate-200" />
        </label>
      </div>

      <label className="block">
        <span className="label">Greeting</span>
        <input name="greeting" defaultValue={bot.greeting} required className="input" />
      </label>

      <label className="block">
        <span className="label">Persona & instructions</span>
        <textarea name="systemPrompt" defaultValue={bot.systemPrompt} rows={4} required className="input" />
        <p className="hint">Tone and rules for the AI. It always answers from the knowledge base and cites sources.</p>
      </label>

      <label className="block">
        <span className="label">Starter questions</span>
        <textarea name="starters" defaultValue={bot.starters.join("\n")} rows={3} className="input" placeholder={"One per line (max 3)\nHow do refunds work?"} />
      </label>

      <label className="block">
        <span className="label">Allowed websites</span>
        <textarea
          name="allowedOrigins"
          defaultValue={bot.allowedOrigins.join("\n")}
          rows={2}
          className="input font-mono text-xs"
          placeholder={"https://www.example.com\nhttps://help.example.com"}
        />
        <p className="hint">Enforced with a CSP <code>frame-ancestors</code> header. Leave empty to allow any site (handy while testing).</p>
      </label>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="handoffEnabled" defaultChecked={bot.handoffEnabled} className="mt-0.5 size-4 accent-indigo-600" />
        <span>
          <span className="block text-sm font-medium">Human handoff</span>
          <span className="text-xs text-slate-500">Visitors can ask for a person, and AI triage can escalate frustrated or blocked customers to your inbox.</span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary">
          {pending && <Loader2 className="size-4 animate-spin" />} Save changes
        </button>
        {state?.ok && <span className="text-sm text-emerald-600">{state.ok}</span>}
        {state?.error && <span className="text-sm text-rose-600">{state.error}</span>}
      </div>
    </form>
  );
}
