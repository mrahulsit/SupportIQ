import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
      <p className="mb-8 mt-1 text-sm text-slate-500">You’ll get a starter assistant you can try right away.</p>
      <AuthForm mode="signup" />
    </>
  );
}
