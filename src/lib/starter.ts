import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { ingestDocument } from "@/lib/ingest";

export function newPublicKey() {
  return `siq_${randomBytes(9).toString("base64url")}`;
}

const STARTER_DOC = `# Getting started with your assistant

This is a starter article so your assistant has something to answer from. Replace it with your own help-centre content.

## How do I add content to the assistant?
Open the bot in the SupportIQ dashboard and go to Knowledge. You can paste text or add a public URL such as a help-centre page. SupportIQ splits the content into passages and indexes them for search.

## How do I put the chat on my website?
Copy the embed snippet from the bot's Settings page and paste it before the closing body tag of your site. It works with any stack, including plain HTML, WordPress, Webflow, React and Next.js.

## What happens when the assistant doesn't know an answer?
It says so instead of guessing, offers to bring in a human, and the question appears under Knowledge gaps so you can add the missing content.`;

/** Every new account gets a ready-to-try bot with one starter article. */
export async function createStarterBot(ownerId: string, ownerName: string) {
  const bot = await db.bot.create({
    data: {
      ownerId,
      publicKey: newPublicKey(),
      name: `${ownerName.split(" ")[0]}'s Assistant`,
      starters: ["How do I put the chat on my website?", "What if you don't know an answer?"],
    },
  });
  const doc = await db.document.create({
    data: { botId: bot.id, title: "Getting started", sourceType: "TEXT", content: STARTER_DOC },
  });
  await ingestDocument(doc.id);
  return bot;
}
