import { LogoMark } from "./LogoMark";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
      <LogoMark className="size-8 drop-shadow-sm" />
      <span className="text-[17px]">
        Support<span className="text-indigo-600">IQ</span>
      </span>
    </span>
  );
}
