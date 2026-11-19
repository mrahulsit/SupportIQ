import "server-only";
import { db } from "@/lib/db";

/** Hosts (other than this app) where a bot's widget has been used in the last 30 days. */
export async function installedOn(botIds: string[], appOrigin: string) {
  if (botIds.length === 0) return [];
  const appHost = safeHost(appOrigin);
  const rows = await db.conversation.findMany({
    where: { botId: { in: botIds }, pageUrl: { not: null }, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    select: { pageUrl: true, botId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const seen = new Map<string, { host: string; botId: string; lastSeen: Date }>();
  for (const r of rows) {
    const host = safeHost(r.pageUrl!);
    if (!host || host === appHost || seen.has(host)) continue;
    seen.set(host, { host, botId: r.botId, lastSeen: r.createdAt });
  }
  return [...seen.values()];
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export type SetupStep = { id: string; title: string; body: string; done: boolean; href: string; cta: string };

/** Getting-started checklist for a user's first assistant. */
export async function setupSteps(ownerId: string, appOrigin: string): Promise<SetupStep[]> {
  const bot = await db.bot.findFirst({ where: { ownerId }, orderBy: { createdAt: "asc" } });
  if (!bot) {
    return [{ id: "create", title: "Create an assistant", body: "Each assistant has its own knowledge base and embed code.", done: false, href: "/dashboard/bots", cta: "Create assistant" }];
  }
  const base = `/dashboard/bots/${bot.id}`;
  const [ownDocs, conversations, hosts] = await Promise.all([
    db.document.count({ where: { botId: bot.id, status: "READY", NOT: { title: "Getting started" } } }),
    db.conversation.count({ where: { botId: bot.id } }),
    installedOn([bot.id], appOrigin),
  ]);
  const personalised = bot.updatedAt.getTime() - bot.createdAt.getTime() > 10_000;

  return [
    { id: "create", title: "Create an assistant", body: `“${bot.name}” is ready.`, done: true, href: base, cta: "Open" },
    {
      id: "knowledge",
      title: "Add your own knowledge",
      body: "Paste FAQs, policies or a help-centre URL. The assistant only answers from this content.",
      done: ownDocs > 0,
      href: `${base}/knowledge`,
      cta: "Add knowledge",
    },
    {
      id: "personalise",
      title: "Make it yours",
      body: "Set the name, greeting, brand colour and starter questions visitors see.",
      done: personalised,
      href: `${base}/settings`,
      cta: "Open settings",
    },
    {
      id: "test",
      title: "Try a conversation",
      body: "Ask it a few questions on the test page to see how it answers.",
      done: conversations > 0,
      href: `/test/${bot.publicKey}`,
      cta: "Open test page",
    },
    {
      id: "install",
      title: "Install it on your website",
      body: hosts.length ? `Seen on ${hosts.map((h) => h.host).join(", ")}.` : "Paste the script tag into your site, then open a chat there.",
      done: hosts.length > 0,
      href: base,
      cta: "Get the snippet",
    },
  ];
}
