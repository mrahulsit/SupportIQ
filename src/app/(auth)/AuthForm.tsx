"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { logIn, signUp, type AuthState } from "./actions";

export function AuthForm({ mode, next, demoEmail }: { mode: "login" | "signup"; next?: string; demoEmail?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? logIn : signUp, undefined);

  return (
    <form action={action} className="space-y-4">
      {mode === "signup" && (
        <Field label="Name" name="name" autoComplete="name" placeholder="Ada Lovelace" />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@company.com" defaultValue={demoEmail} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
      />
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{state.error}</p>}

      <button disabled={pending} className="btn-primary w-full justify-center py-2.5">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {mode === "login" ? "Log in" : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? (
          <>
            New here? <Link href="/signup" className="font-medium text-indigo-600 hover:underline">Create an account</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/login" className="font-medium text-indigo-600 hover:underline">Log in</Link>
          </>
        )}
      </p>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input required {...rest} className="input" />
    </label>
  );
}
