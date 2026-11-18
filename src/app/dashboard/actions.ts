"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { findOwnedConversation, requireOwnedBot, requireUser } from "@/lib/auth";
import { ingestDocument } from "@/lib/ingest";
import { newPublicKey } from "@/lib/starter";
import { normaliseOrigin } from "@/lib/utils";
import { draftAgentReply, knowledgeGaps, suggestArticle } from "@/lib/ai/copilot";
import { triageConversation } from "@/lib/ai/triage";

export type FormState = { error?: string; ok?: string } | undefined;

// ---------------------------------------------------------------- bots

const BotInput = z.object({
  name: z.string().trim().min(2).max(60),
  greeting: z.string().trim().min(2).max(300),
  systemPrompt: z.string().trim().min(10).max(2000),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #4f46e5"),
  allowedOrigins: z.string().max(2000).default(""),
  starters: z.string().max(600).default(""),
  handoffEnabled: z.literal("on").optional(),
});

export async function createBot(form: FormData) {
  const user = await requireUser();
  const name = z.string().trim().min(2).max(60).safeParse(form.get("name"));
  const bot = await db.bot.create({
    data: { ownerId: user.id, name: name.success ? name.data : "New assistant", publicKey: newPublicKey() },
  });
  redirect(`/dashboard/bots/${bot.id}`);
}

export async function updateBot(botId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireOwnedBot(botId);
  const parsed = BotInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: `${String(parsed.error.issues[0].path[0])}: ${parsed.error.issues[0].message}` };
  const d = parsed.data;

  const lines = d.allowedOrigins.split(/[\s,]+/).filter(Boolean);
  const origins = lines.map(normaliseOrigin);
  const bad = lines.find((_, i) => !origins[i]);
  if (bad) return { error: `"${bad}" is not a valid origin (use https://example.com)` };

  await db.bot.update({
    where: { id: botId },
    data: {
      name: d.name,
      greeting: d.greeting,
      systemPrompt: d.systemPrompt,
      brandColor: d.brandColor.toLowerCase(),
      allowedOrigins: [...new Set(origins as string[])],
      starters: d.starters.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 3),
      handoffEnabled: d.handoffEnabled === "on",
    },
  });
  revalidatePath(`/dashboard/bots/${botId}`);
  return { ok: "Saved" };
}

export async function deleteBot(botId: string) {
  await requireOwnedBot(botId);
  await db.bot.delete({ where: { id: botId } });
  redirect("/dashboard/bots");
}

// ---------------------------------------------------------------- knowledge base

const TextDoc = z.object({ title: z.string().trim().min(2).max(200), content: z.string().trim().min(20).max(200_000) });
const UrlDoc = z.object({ url: z.string().trim().url().max(500) });

export async function addTextDocument(botId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireOwnedBot(botId);
  const parsed = TextDoc.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Add a title and at least a couple of sentences of content." };
  const doc = await db.document.create({ data: { botId, sourceType: "TEXT", ...parsed.data } });
  after(() => ingestDocument(doc.id));
  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  return { ok: "Indexing… this takes a few seconds." };
}

export async function addUrlDocument(botId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireOwnedBot(botId);
  const parsed = UrlDoc.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter a full URL, e.g. https://example.com/help/refunds" };
  const doc = await db.document.create({
    data: { botId, sourceType: "URL", sourceUrl: parsed.data.url, title: parsed.data.url, content: "" },
  });
  after(() => ingestDocument(doc.id));
  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
  return { ok: "Fetching and indexing the page…" };
}

export async function reindexDocument(botId: string, documentId: string) {
  await requireOwnedBot(botId);
  const doc = await db.document.updateMany({ where: { id: documentId, botId }, data: { status: "PROCESSING", error: null } });
  if (doc.count) after(() => ingestDocument(documentId));
  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
}

export async function deleteDocument(botId: string, documentId: string) {
  await requireOwnedBot(botId);
  await db.document.deleteMany({ where: { id: documentId, botId } });
  revalidatePath(`/dashboard/bots/${botId}/knowledge`);
}

/** AI: turns the bot's unanswered questions into a draft help article. */
export async function draftGapArticle(botId: string): Promise<{ title: string; content: string } | { error: string }> {
  const { bot } = await requireOwnedBot(botId);
  const gaps = await knowledgeGaps([bot.id], 15);
  if (gaps.length === 0) return { error: "No knowledge gaps yet — nice!" };
  const content = await suggestArticle(bot.id, bot.name, gaps.map((g) => g.question));
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Frequently asked questions";
  return { title, content };
}

// ---------------------------------------------------------------- inbox

async function ownedConversation(conversationId: string) {
  const user = await requireUser();
  const convo = await findOwnedConversation(user.id, conversationId);
  if (!convo) throw new Error("Conversation not found");
  return { user, convo };
}

const Reply = z.string().trim().min(1).max(4000);

export async function sendAgentReply(conversationId: string, content: string) {
  const { user, convo } = await ownedConversation(conversationId);
  const parsed = Reply.safeParse(content);
  if (!parsed.success) return { error: "Reply can't be empty" };
  await db.message.create({ data: { conversationId, role: "AGENT", content: parsed.data, agentId: user.id } });
  await db.conversation.update({
    where: { id: conversationId },
    data: { status: "HUMAN", lastMessageAt: new Date(), escalatedAt: convo.escalatedAt ?? new Date() },
  });
  revalidatePath("/dashboard/inbox", "layout");
  return { ok: true };
}

const StatusInput = z.enum(["AI", "HUMAN", "RESOLVED"]);

export async function setConversationStatus(conversationId: string, status: string) {
  const { convo } = await ownedConversation(conversationId);
  const s = StatusInput.parse(status);
  const agentReplies = s === "RESOLVED" ? await db.message.count({ where: { conversationId, role: "AGENT" } }) : 0;
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      status: s,
      ...(s === "RESOLVED"
        ? { resolvedAt: new Date(), resolvedBy: agentReplies > 0 ? "AGENT" : "AI" }
        : { resolvedAt: null, resolvedBy: null }),
      ...(s === "HUMAN" ? { escalatedAt: convo.escalatedAt ?? new Date() } : {}),
    },
  });
  if (s !== convo.status) {
    const note = { AI: "Handed back to the AI assistant.", HUMAN: "A teammate joined the conversation.", RESOLVED: "Conversation marked resolved." }[s];
    await db.message.create({ data: { conversationId, role: "SYSTEM", content: note } });
  }
  revalidatePath("/dashboard/inbox", "layout");
}

/** AI copilot: suggested reply for the agent (not sent until they approve it). */
export async function generateDraft(conversationId: string) {
  await ownedConversation(conversationId);
  return { draft: await draftAgentReply(conversationId) };
}

export async function retriage(conversationId: string) {
  await ownedConversation(conversationId);
  await triageConversation(conversationId);
  revalidatePath("/dashboard/inbox", "layout");
}
