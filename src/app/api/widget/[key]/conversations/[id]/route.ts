import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { VisitorId, getBotByKey, getVisitorConversation, json, toPublicMessage } from "@/lib/widget";

/** Visitor-side history + polling for agent replies: ?visitorId=…&after=ISO */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/widget/[key]/conversations/[id]">) {
  const { key, id } = await ctx.params;
  const visitorId = VisitorId.safeParse(req.nextUrl.searchParams.get("visitorId"));
  if (!visitorId.success) return json({ error: "Invalid visitor" }, { status: 400 });

  const bot = await getBotByKey(key);
  if (!bot) return json({ error: "Unknown bot" }, { status: 404 });
  const convo = await getVisitorConversation(bot.id, id, visitorId.data);
  if (!convo) return json({ error: "Not found" }, { status: 404 });

  const afterParam = req.nextUrl.searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : null;

  const messages = await db.message.findMany({
    where: {
      conversationId: convo.id,
      role: { not: "SYSTEM" },
      ...(after && !isNaN(after.getTime()) ? { createdAt: { gt: after } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { agent: { select: { name: true } } },
    take: 100,
  });

  return json({ status: convo.status, csat: convo.csat, messages: messages.map(toPublicMessage) });
}
