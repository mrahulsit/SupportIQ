import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, demo } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-8 mt-1 text-sm text-slate-500">Log in to your SupportIQ workspace.</p>
      {demo === "1" && process.env.DEMO_EMAIL && (
        <p className="mb-6 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          Demo account: <b>{process.env.DEMO_EMAIL}</b> / <b>{process.env.DEMO_PASSWORD}</b>
        </p>
      )}
      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} demoEmail={demo === "1" ? process.env.DEMO_EMAIL : undefined} />
    </>
  );
}
