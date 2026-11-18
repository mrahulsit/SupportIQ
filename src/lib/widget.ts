import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Message } from "@/generated/prisma/client";

export const VisitorId = z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/);

export async function getBotByKey(publicKey: string) {
  return db.bot.findUnique({ where: { publicKey } });
}

/** A conversation is only visible to the visitor who started it. */
export async function getVisitorConversation(botId: string, conversationId: string, visitorId: string) {
  return db.conversation.findFirst({ where: { id: conversationId, botId, visitorId } });
}

export type PublicMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "AGENT" | "SYSTEM";
  content: string;
  sources: { n: number; title: string; url: string | null; snippet: string }[];
  unanswered: boolean;
  feedback: number | null;
  agentName: string | null;
  createdAt: string;
};

export function toPublicMessage(m: Message & { agent?: { name: string } | null }): PublicMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    sources: Array.isArray(m.sources) ? (m.sources as PublicMessage["sources"]) : [],
    unanswered: m.unanswered,
    feedback: m.feedback,
    agentName: m.agent?.name?.split(" ")[0] ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}
