"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { addTextDocument, addUrlDocument, type FormState } from "../../../actions";

export function AddDocumentForms({ botId }: { botId: string }) {
  const [tab, setTab] = useState<"text" | "url">("text");
  const [textState, textAction, textPending] = useActionState<FormState, FormData>(addTextDocument.bind(null, botId), undefined);
  const [urlState, urlAction, urlPending] = useActionState<FormState, FormData>(addUrlDocument.bind(null, botId), undefined);
  const state = tab === "text" ? textState : urlState;

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Add knowledge</h2>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          {(["text", "url"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-md px-3 py-1 ${tab === t ? "bg-white shadow-sm" : "text-slate-500"}`}>
              {t === "text" ? "Paste text" : "From URL"}
            </button>
          ))}
        </div>
      </div>

      {tab === "text" ? (
        <form action={textAction} className="space-y-3" key="text">
          <input name="title" required placeholder="Title, e.g. Refund policy" className="input" />
          <textarea name="content" required rows={7} placeholder="Paste a help article, FAQ, policy… Markdown is fine." className="input" />
          <Submit pending={textPending} label="Add & index" />
        </form>
      ) : (
        <form action={urlAction} className="space-y-3" key="url">
          <input name="url" type="url" required placeholder="https://example.com/help/getting-started" className="input" />
          <p className="hint">SupportIQ fetches the page, extracts the readable text, chunks it and embeds it. Public pages only.</p>
          <Submit pending={urlPending} label="Fetch & index" />
        </form>
      )}
      {state?.error && <p className="mt-3 text-sm text-rose-600">{state.error}</p>}
      {state?.ok && <p className="mt-3 text-sm text-emerald-600">{state.ok}</p>}
    </section>
  );
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button disabled={pending} className="btn-primary">
      {pending && <Loader2 className="size-4 animate-spin" />} {label}
    </button>
  );
}
