"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { addTextDocument, draftGapArticle, type FormState } from "../../../actions";

/** AI: drafts a help article from unanswered questions; the owner edits and publishes it. */
export function GapArticle({ botId }: { botId: string }) {
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafting, startDrafting] = useTransition();
  const [state, save, saving] = useActionState<FormState, FormData>(async (prev, form) => {
    const res = await addTextDocument(botId, prev, form);
    if (res?.ok) setDraft(null);
    return res;
  }, undefined);

  if (!draft) {
    return (
      <div className="border-t border-slate-100 p-4">
        <button
          onClick={() =>
            startDrafting(async () => {
              const res = await draftGapArticle(botId);
              if ("error" in res) setError(res.error);
              else setDraft(res);
            })
          }
          disabled={drafting}
          className="btn-secondary w-full justify-center"
        >
          {drafting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-indigo-600" />}
          Draft an article that answers these
        </button>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        {state?.ok && <p className="mt-2 text-xs text-emerald-600">Article added — indexing now.</p>}
      </div>
    );
  }

  return (
    <form action={save} className="space-y-2 border-t border-slate-100 p-4">
      <p className="text-xs font-medium text-indigo-700">AI draft — review and fill any [TODO]s before publishing</p>
      <input name="title" defaultValue={draft.title} className="input" />
      <textarea name="content" defaultValue={draft.content} rows={12} className="input font-mono text-xs" />
      <div className="flex gap-2">
        <button disabled={saving} className="btn-primary">
          {saving && <Loader2 className="size-4 animate-spin" />} Add to knowledge base
        </button>
        <button type="button" onClick={() => setDraft(null)} className="btn-ghost">
          Discard
        </button>
      </div>
    </form>
  );
}
