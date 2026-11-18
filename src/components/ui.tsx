import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  AI: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  NEEDS_HUMAN: "bg-amber-50 text-amber-800 ring-amber-200",
  HUMAN: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  RESOLVED: "bg-slate-100 text-slate-600 ring-slate-200",
  READY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PROCESSING: "bg-sky-50 text-sky-700 ring-sky-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
  URGENT: "bg-rose-600 text-white ring-rose-600",
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200",
  MEDIUM: "bg-amber-50 text-amber-800 ring-amber-200",
  LOW: "bg-slate-100 text-slate-600 ring-slate-200",
  POSITIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  NEUTRAL: "bg-slate-100 text-slate-600 ring-slate-200",
  NEGATIVE: "bg-rose-50 text-rose-700 ring-rose-200",
};

const LABELS: Record<string, string> = { AI: "AI handling", NEEDS_HUMAN: "Needs human", HUMAN: "With agent", RESOLVED: "Resolved" };

export function Badge({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return null;
  const label = LABELS[value] ?? value.charAt(0) + value.slice(1).toLowerCase();
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", STATUS_STYLES[value] ?? "bg-slate-100 text-slate-700 ring-slate-200", className)}>
      {label}
    </span>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">{icon}</div>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-slate-500">{children}</div>}
    </div>
  );
}
