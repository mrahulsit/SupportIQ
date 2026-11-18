import type { NextRequest } from "next/server";
import { getBotByKey, json } from "@/lib/widget";

/** Public widget configuration (also used by the proxy to build the CSP frame-ancestors list). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/widget/[key]/config">) {
  const { key } = await ctx.params;
  const bot = await getBotByKey(key);
  if (!bot) return json({ error: "Unknown bot" }, { status: 404 });
  return json(
    {
      name: bot.name,
      greeting: bot.greeting,
      brandColor: bot.brandColor,
      handoffEnabled: bot.handoffEnabled,
      allowedOrigins: bot.allowedOrigins,
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
