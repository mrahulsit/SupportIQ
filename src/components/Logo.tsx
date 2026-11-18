export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M9 9.5h6M9 12.5h3.5" />
        </svg>
      </span>
      <span className="text-[17px]">
        Support<span className="text-indigo-600">IQ</span>
      </span>
    </span>
  );
}
