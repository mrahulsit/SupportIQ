import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 inline-flex">
            <Logo />
          </Link>
          {children}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-slate-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,.45),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,.25),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <p className="max-w-md text-2xl font-semibold leading-snug">
            “Answers from your docs in seconds, and a clean hand-off to the team when it matters.”
          </p>
          <p className="mt-4 text-sm text-white/60">AI answers · Auto-triage · Agent copilot · Knowledge gaps</p>
        </div>
      </div>
    </div>
  );
}
