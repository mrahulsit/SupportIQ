import type { NextRequest } from "next/server";
import { getBotByKey, json } from "@/lib/widget";

// The loader runs on customers' sites, so every response (including 404s)
// must be readable cross-origin — otherwise it can't tell a wrong key apart
// from a network error.
const CORS = { "Access-Control-Allow-Origin": "*" };

/** Public widget configuration (also used by the proxy to build the CSP frame-ancestors list). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/widget/[key]/config">) {
  const { key } = await ctx.params;
  const bot = await getBotByKey(key);
  if (!bot) return json({ error: "Unknown bot" }, { status: 404, headers: CORS });
  return json(
    {
      name: bot.name,
      greeting: bot.greeting,
      brandColor: bot.brandColor,
      handoffEnabled: bot.handoffEnabled,
      allowedOrigins: bot.allowedOrigins,
    },
    { headers: CORS },
  );
}
