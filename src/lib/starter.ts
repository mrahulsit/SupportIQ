import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { ingestDocument } from "@/lib/ingest";

export function newPublicKey() {
  return `siq_${randomBytes(9).toString("base64url")}`;
}

const STARTER_DOC = `# Getting started with your assistant

This is a starter article so your assistant has something to answer from while you set it up. Add your own help-centre content in the Knowledge base tab.

## How do I install the chat widget on my website?
Open the assistant in the SupportIQ dashboard and go to the Install tab. Pick your platform (HTML, Next.js, React, WordPress, Shopify or Webflow), copy the script tag and paste it just before the closing body tag of your site. A chat button appears in the bottom-right corner.

## How can I test the widget before adding it to my site?
On the Install tab, click "Open test page" to see the widget on a blank page, or "Download test HTML" to run it locally. The Install tab also has a live preview.

## How do I add content to the assistant?
Go to the Knowledge base tab. You can paste text, such as an FAQ or a policy, or add a public URL such as a help-centre page. SupportIQ splits the content into passages and indexes them for search. The assistant only answers from this content.

## Why does the chat say it couldn't load?
The website is not in the assistant's Allowed websites list. Add the site's address in Settings, or leave the list empty while testing.

## What happens when the assistant doesn't know an answer?
It says so instead of guessing and offers to bring in a human. The question appears under Knowledge gaps so you can add the missing content.

## How do I talk to a human?
Click "Talk to a human" in the chat or ask for a person. The conversation moves to the team inbox and a teammate replies in the same chat window.`;

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
