import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { SetupStep } from "@/lib/setup";

/** Getting-started checklist; hidden once every step is done. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.find((s) => !s.done)!;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Get your assistant live</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {done} of {steps.length} done · next: <span className="font-medium text-slate-700">{next.title.toLowerCase()}</span>
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 sm:w-48" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={steps.length}>
          <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
      </div>
      <ol className="divide-y divide-slate-100">
        {steps.map((s, i) => {
          const isNext = s.id === next.id;
          const external = s.href.startsWith("/test/");
          return (
            <li key={s.id} className={`flex items-start gap-3 px-5 py-3.5 ${isNext ? "bg-indigo-50/50" : ""}`}>
              <span
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  s.done ? "bg-emerald-600 text-white" : isNext ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {s.done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${s.done ? "text-slate-500 line-through decoration-slate-300" : ""}`}>{s.title}</p>
                <p className="text-sm text-slate-500">{s.body}</p>
              </div>
              {!s.done && (
                <Link
                  href={s.href}
                  target={external ? "_blank" : undefined}
                  className={`shrink-0 ${isNext ? "btn-primary" : "btn-secondary"} px-3 py-1.5 text-xs`}
                >
                  {s.cta} <ArrowRight className="size-3.5" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
