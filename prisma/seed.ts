/**
 * Seeds a demo workspace: demo user, the SupportIQ demo assistant (whose
 * knowledge base documents SupportIQ itself) and two weeks of sample
 * conversations so the analytics dashboard has data.
 *
 * Run: npm run db:seed   (idempotent — replaces the demo user's data)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { ingestDocument } from "../src/lib/ingest";
import { DEMO_BOT_KEY } from "../src/lib/demo";
import { newPublicKey } from "../src/lib/starter";

const DOCS: { title: string; content: string }[] = [
  {
    title: "What is SupportIQ?",
    content: `SupportIQ is an AI customer support platform. It adds a chat assistant to any website with a single script tag. The assistant answers visitor questions from your own knowledge base, cites the articles it used, and hands the conversation to a human teammate when needed.

Behind the widget, SupportIQ gives your team a dashboard with an inbox, automatic AI triage (summary, topic, sentiment and priority for every conversation), an AI copilot that drafts replies for agents, and analytics such as AI containment rate, answer helpfulness and customer satisfaction (CSAT).

SupportIQ is open source and built with Next.js, TypeScript, PostgreSQL with pgvector, Prisma and the OpenRouter API. You can self-host it for free.`,
  },
  {
    title: "Installing the chat widget",
    content: `To install the widget, open your assistant in the SupportIQ dashboard, go to Settings & embed, and copy the embed snippet. Paste it just before the closing </body> tag of your website:

<script src="https://your-supportiq-host/widget.js" data-bot="YOUR_BOT_KEY" async></script>

The snippet works with any stack: plain HTML, WordPress, Webflow, Shopify, React, Vue and Next.js. No build step is needed on your side.

Optional attributes: data-position="left" moves the chat button to the bottom-left corner, and data-color="#hex" overrides the button colour. You can open the chat from your own buttons with window.SupportIQ.open() and close it with window.SupportIQ.close().

The widget loads lazily: the chat iframe is only created the first time a visitor opens it, so it doesn't slow down your page.`,
  },
  {
    title: "How the AI answers questions",
    content: `SupportIQ uses retrieval-augmented generation (RAG). When you add knowledge, each document is split into overlapping passages and converted into vector embeddings stored in PostgreSQL with pgvector.

When a visitor asks a question, SupportIQ runs a hybrid search: semantic search with pgvector cosine similarity plus keyword search with Postgres full-text search. The two result lists are merged with Reciprocal Rank Fusion. The best passages are given to the language model, which is instructed to answer only from them and to cite them like [1] and [2].

If the knowledge base doesn't cover the question, the assistant says it doesn't know instead of guessing, offers a human, and records the question as a knowledge gap. Replies stream to the visitor token by token using Server-Sent Events.`,
  },
  {
    title: "Adding knowledge to your assistant",
    content: `Open your assistant and go to the Knowledge base tab. You can add knowledge in two ways:

- Paste text: give it a title and paste a help article, FAQ, policy or product description. Markdown is supported.
- From URL: enter the address of a public web page, such as a help-centre article. SupportIQ fetches the page, extracts the readable text and indexes it.

Indexing usually takes a few seconds. Each source shows how many passages were indexed. Use Re-index after you update a web page, and delete sources that are out of date.

The Knowledge gaps panel lists questions the assistant could not answer. Click "Draft an article that answers these" and the AI writes a draft help article from those questions; review it, fill in any [TODO] placeholders, and add it to the knowledge base.`,
  },
  {
    title: "Talking to a human and the team inbox",
    content: `Visitors can reach a person at any time by clicking "Talk to a human" in the widget or simply asking for a human, an agent or a real person. AI triage also escalates conversations automatically when a customer is clearly frustrated or needs an account-specific action.

Escalated conversations appear at the top of the Inbox, sorted by AI-assigned priority (urgent, high, medium, low). An agent can take over, reply, hand the conversation back to the AI, or resolve it. Agent replies appear in the visitor's widget within a few seconds.

In the inbox, "Draft reply with AI" writes a suggested answer using the conversation and your knowledge base. The agent can edit it before sending — nothing is sent without the agent's approval.`,
  },
  {
    title: "Security and privacy",
    content: `All model calls happen on the SupportIQ server, so your OpenRouter API key never reaches the browser. The chat runs inside an iframe on the SupportIQ origin, isolated from the host page.

You choose which websites may embed your assistant in Settings under Allowed websites; SupportIQ enforces this with a Content-Security-Policy frame-ancestors header. Chat requests are rate limited per visitor. Model output is rendered as markdown with raw HTML disabled, which prevents script injection.

Dashboard sessions use signed, HTTP-only cookies and passwords are hashed with bcrypt. Each visitor can only read their own conversation. URL ingestion only fetches public addresses, blocking private network ranges to prevent server-side request forgery.`,
  },
  {
    title: "Troubleshooting the widget",
    content: `The chat button doesn't appear: check that the script tag is on the page, that data-bot contains your assistant's public key (it starts with siq_), and look for errors in the browser console.

The chat panel is blank or refuses to load: your site is probably not in the assistant's Allowed websites list. Add your site's origin, for example https://www.example.com, or leave the list empty while testing.

The assistant says it doesn't know something you documented: open the Knowledge base tab and make sure the source shows as Ready. Try rephrasing the article so the key terms customers use appear in it, then re-index.

"You're sending messages too quickly": each visitor can send up to 20 messages per minute. Wait a moment and try again.`,
  },
];

type Seed = {
  q: string;
  a: string;
  category: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  outcome: "ai" | "escalated" | "agent" | "open";
  unanswered?: boolean;
  agent?: string;
  csat?: number;
};

const CONVERSATIONS: Seed[] = [
  { q: "How do I add the chat to my WordPress site?", a: "Copy the embed snippet from Settings & embed and paste it before the closing </body> tag — it works on WordPress without a build step [1].", category: "technical", sentiment: "NEUTRAL", priority: "LOW", outcome: "ai", csat: 5 },
  { q: "Can the assistant answer from our help centre pages?", a: "Yes — add each page under Knowledge base → From URL and SupportIQ will fetch, extract and index it [1].", category: "technical", sentiment: "POSITIVE", priority: "LOW", outcome: "ai", csat: 5 },
  { q: "Is my API key exposed in the browser?", a: "No. All model calls happen on the SupportIQ server, so the key never reaches the browser [1].", category: "technical", sentiment: "NEUTRAL", priority: "MEDIUM", outcome: "ai", csat: 4 },
  { q: "Do you offer a HIPAA compliant plan?", a: "I couldn't find that in our help articles. Would you like me to connect you with a teammate?", category: "sales", sentiment: "NEUTRAL", priority: "MEDIUM", outcome: "escalated", unanswered: true, agent: "Thanks for asking! We don't offer a HIPAA plan today — happy to talk through your requirements." },
  { q: "The widget is blank on my site and I've tried everything", a: "That usually means your site isn't in the Allowed websites list [1]. Add your origin, or leave the list empty while testing.", category: "technical", sentiment: "NEGATIVE", priority: "HIGH", outcome: "agent", agent: "I checked your workspace — your staging domain was missing from Allowed websites. I've added it, can you refresh?", csat: 5 },
  { q: "How does the AI decide when to hand off to a human?", a: "Visitors can ask for a human any time, and AI triage escalates frustrated customers or ones needing account-specific actions [1].", category: "technical", sentiment: "NEUTRAL", priority: "LOW", outcome: "ai", csat: 4 },
  { q: "Can I change the button colour?", a: "Yes — set the brand colour in Settings, or override it with data-color on the script tag [1].", category: "technical", sentiment: "POSITIVE", priority: "LOW", outcome: "ai" },
  { q: "What languages does the widget support?", a: "I couldn't find that in our help articles. Would you like me to connect you with a teammate?", category: "other", sentiment: "NEUTRAL", priority: "LOW", outcome: "ai", unanswered: true },
  { q: "I want to talk to a real person about pricing", a: "Sure — I've let the team know and a teammate will reply right here.", category: "sales", sentiment: "NEUTRAL", priority: "MEDIUM", outcome: "open" },
  { q: "Can I export my conversations to CSV?", a: "I couldn't find that in our help articles. Would you like me to connect you with a teammate?", category: "feedback", sentiment: "NEUTRAL", priority: "LOW", outcome: "ai", unanswered: true },
  { q: "Why does it say I'm sending messages too quickly??", a: "Each visitor can send up to 20 messages per minute — wait a moment and try again [1].", category: "technical", sentiment: "NEGATIVE", priority: "MEDIUM", outcome: "ai", csat: 3 },
  { q: "How do I open the chat from my own button?", a: "Call window.SupportIQ.open() from your button's click handler [1].", category: "technical", sentiment: "POSITIVE", priority: "LOW", outcome: "ai", csat: 5 },
  { q: "Our checkout is broken since installing the widget, this is urgent", a: "I'm sorry about that — I've escalated this to the team right away.", category: "technical", sentiment: "NEGATIVE", priority: "URGENT", outcome: "open" },
  { q: "Does SupportIQ integrate with Slack?", a: "I couldn't find that in our help articles. Would you like me to connect you with a teammate?", category: "sales", sentiment: "NEUTRAL", priority: "LOW", outcome: "ai", unanswered: true },
  { q: "How long does indexing a document take?", a: "Indexing usually takes a few seconds; each source shows how many passages were indexed [1].", category: "technical", sentiment: "NEUTRAL", priority: "LOW", outcome: "ai", csat: 4 },
  { q: "Where are the knowledge gaps shown?", a: "On the Knowledge base tab — the Knowledge gaps panel lists questions the assistant couldn't answer [1].", category: "technical", sentiment: "POSITIVE", priority: "LOW", outcome: "ai" },
  { q: "Can agents edit the AI draft before sending?", a: "Yes — Draft reply with AI only suggests text; nothing is sent without the agent's approval [1].", category: "technical", sentiment: "NEUTRAL", priority: "LOW", outcome: "ai", csat: 5 },
  { q: "I was charged twice for my subscription", a: "I couldn't find that in our help articles. Would you like me to connect you with a teammate?", category: "billing", sentiment: "NEGATIVE", priority: "URGENT", outcome: "agent", unanswered: true, agent: "So sorry about that! SupportIQ is self-hosted and free, so this charge isn't from us — could you share the merchant name on the statement?", csat: 4 },
];

const DAY = 86_400_000;

async function main() {
  const email = (process.env.DEMO_EMAIL ?? "demo@supportiq.dev").toLowerCase();
  const password = process.env.DEMO_PASSWORD ?? "demo-password-123";

  await db.user.deleteMany({ where: { email } });
  await db.bot.deleteMany({ where: { publicKey: DEMO_BOT_KEY } });

  const user = await db.user.create({
    data: { email, name: "Demo Agent", passwordHash: await bcrypt.hash(password, 12) },
  });

  const bot = await db.bot.create({
    data: {
      ownerId: user.id,
      publicKey: DEMO_BOT_KEY,
      name: "SupportIQ Assistant",
      greeting: "Hi! 👋 I'm the SupportIQ assistant. Ask me how SupportIQ works, how to install it, or anything about this project.",
      systemPrompt: "You are SupportIQ's own support assistant. Be friendly, precise and brief. Prefer step-by-step instructions for how-to questions.",
      brandColor: "#4f46e5",
      starters: ["What does SupportIQ do?", "How do I install the widget?", "How does the AI answer questions?"],
    },
  });

  // A second assistant so the dashboard shows multi-bot support.
  await db.bot.create({
    data: {
      ownerId: user.id,
      publicKey: newPublicKey(),
      name: "Acme Store Help",
      brandColor: "#059669",
      greeting: "Hi! Questions about orders, shipping or returns? Ask away.",
      starters: ["Where is my order?", "How do returns work?"],
    },
  });

  console.log(`Indexing ${DOCS.length} knowledge-base articles…`);
  for (const d of DOCS) {
    const doc = await db.document.create({ data: { botId: bot.id, sourceType: "TEXT", ...d } });
    await ingestDocument(doc.id);
  }

  console.log(`Creating ${CONVERSATIONS.length} sample conversations…`);
  const now = Date.now();
  for (let i = 0; i < CONVERSATIONS.length; i++) {
    const s = CONVERSATIONS[i];
    const start = new Date(now - ((i * 7919) % 13) * DAY - ((i * 3571) % 20) * 3_600_000 - 3_600_000);
    const t = (min: number) => new Date(start.getTime() + min * 60_000);
    const escalated = s.outcome !== "ai";
    const resolved = s.outcome === "ai" || s.outcome === "agent" || s.outcome === "escalated";
    const hasAgent = !!s.agent;

    const convo = await db.conversation.create({
      data: {
        botId: bot.id,
        visitorId: `v_seed${String(i).padStart(4, "0")}aaaa`,
        pageUrl: "https://www.example.com/pricing",
        status: s.outcome === "open" ? "NEEDS_HUMAN" : resolved ? "RESOLVED" : "HUMAN",
        summary: s.q,
        category: s.category,
        sentiment: s.sentiment,
        priority: s.priority,
        triagedAt: t(1),
        escalatedAt: escalated ? t(1) : null,
        csat: s.csat ?? null,
        resolvedAt: resolved ? t(hasAgent ? 30 : 3) : null,
        resolvedBy: resolved ? (hasAgent ? "AGENT" : "AI") : null,
        createdAt: start,
        lastMessageAt: t(hasAgent ? 25 : 1),
      },
    });

    const messages: { role: "USER" | "ASSISTANT" | "AGENT" | "SYSTEM"; content: string; at: Date; extra?: object }[] = [
      { role: "USER", content: s.q, at: t(0) },
      {
        role: "ASSISTANT",
        content: s.a,
        at: t(0.1),
        extra: {
          unanswered: !!s.unanswered,
          confidence: s.unanswered ? 0.12 : 0.62 + (i % 4) * 0.08,
          sources: s.unanswered ? [] : [{ n: 1, title: DOCS[(i % (DOCS.length - 1)) + 1].title, url: null, snippet: "" }],
          latencyMs: 900 + ((i * 337) % 1800),
          model: "google/gemma-4-31b-it:free",
          feedback: s.csat ? (s.csat >= 4 ? 1 : -1) : null,
        },
      },
    ];
    if (escalated) messages.push({ role: "SYSTEM", content: "Visitor asked for a human.", at: t(1) });
    if (s.agent) messages.push({ role: "AGENT", content: s.agent, at: t(25), extra: { agentId: user.id } });

    for (const m of messages) {
      await db.message.create({ data: { conversationId: convo.id, role: m.role, content: m.content, createdAt: m.at, ...m.extra } });
    }
  }

  console.log(`\nDone. Log in at /login with ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
