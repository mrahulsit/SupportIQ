import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, verifySession } from "./session";

export type CurrentUser = { id: string; name: string; email: string };

/**
 * Data Access Layer entry point: verifies the session cookie and loads the user.
 * Memoised per request with React `cache`.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true },
  });
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Loads a bot only if it belongs to the signed-in user (authorization check). */
export async function requireOwnedBot(botId: string) {
  const user = await requireUser();
  const bot = await db.bot.findFirst({ where: { id: botId, ownerId: user.id } });
  if (!bot) redirect("/dashboard/bots");
  return { user, bot };
}

/** Same check for a conversation: it must belong to one of the user's bots. */
export async function findOwnedConversation(userId: string, conversationId: string) {
  return db.conversation.findFirst({
    where: { id: conversationId, bot: { ownerId: userId } },
    include: { bot: true },
  });
}
