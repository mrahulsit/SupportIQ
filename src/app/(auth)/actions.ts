"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { createStarterBot } from "@/lib/starter";

export type AuthState = { error?: string } | undefined;

const SignUp = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const Login = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

let dummyHash: string | undefined;

async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, await signSession({ userId }), sessionCookieOptions);
}

function safeNext(next?: string) {
  return next && next.startsWith("/dashboard") ? next : "/dashboard";
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = SignUp.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists" };

  const user = await db.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
  });
  await createStarterBot(user.id, name);
  await startSession(user.id);
  redirect("/dashboard");
}

export async function logIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = Login.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, next } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  // Compare against a dummy hash when the user doesn't exist to keep timing similar.
  dummyHash ??= await bcrypt.hash("timing-equaliser", 12);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !ok) return { error: "Incorrect email or password" };

  await startSession(user.id);
  redirect(safeNext(next));
}

export async function logOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
