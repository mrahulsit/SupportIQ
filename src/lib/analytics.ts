import "server-only";
import { db } from "@/lib/db";

export type Overview = Awaited<ReturnType<typeof getOverview>>;

/** Dashboard metrics for all bots owned by a user over the last `days` days. */
export async function getOverview(ownerId: string, days = 14) {
  const since = new Date(Date.now() - days * 86_400_000);
  const scope = { bot: { ownerId }, createdAt: { gte: since } };

  const [total, escalated, resolved, resolvedByAi, open, csat, feedbackUp, feedbackDown, latency, categories, sentiments, perDay] =
    await Promise.all([
      db.conversation.count({ where: scope }),
      db.conversation.count({ where: { ...scope, escalatedAt: { not: null } } }),
      db.conversation.count({ where: { ...scope, status: "RESOLVED" } }),
      db.conversation.count({ where: { ...scope, status: "RESOLVED", resolvedBy: "AI" } }),
      db.conversation.count({ where: { bot: { ownerId }, status: { in: ["NEEDS_HUMAN", "HUMAN"] } } }),
      db.conversation.aggregate({ where: { ...scope, csat: { not: null } }, _avg: { csat: true }, _count: { csat: true } }),
      db.message.count({ where: { conversation: scope, feedback: 1 } }),
      db.message.count({ where: { conversation: scope, feedback: -1 } }),
      db.message.aggregate({ where: { conversation: scope, role: "ASSISTANT", latencyMs: { not: null } }, _avg: { latencyMs: true } }),
      db.conversation.groupBy({ by: ["category"], where: { ...scope, category: { not: null } }, _count: { _all: true } }),
      db.conversation.groupBy({ by: ["sentiment"], where: { ...scope, sentiment: { not: null } }, _count: { _all: true } }),
      db.$queryRaw<{ day: Date; total: bigint; escalated: bigint }[]>`
        SELECT date_trunc('day', c."createdAt") AS day,
               count(*) AS total,
               count(c."escalatedAt") AS escalated
        FROM "Conversation" c JOIN "Bot" b ON b.id = c."botId"
        WHERE b."ownerId" = ${ownerId} AND c."createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1`,
    ]);

  // Fill missing days so the chart has a bar slot per day.
  const byDay = new Map(perDay.map((r) => [r.day.toISOString().slice(0, 10), r]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const row = byDay.get(key);
    return { day: key, total: Number(row?.total ?? 0), escalated: Number(row?.escalated ?? 0) };
  });

  const rated = feedbackUp + feedbackDown;
  return {
    days,
    total,
    open,
    containment: total ? (total - escalated) / total : null,
    aiResolutionRate: resolved ? resolvedByAi / resolved : null,
    csat: csat._avg.csat,
    csatCount: csat._count.csat,
    helpfulRate: rated ? feedbackUp / rated : null,
    avgLatencyMs: latency._avg.latencyMs,
    categories: categories.map((c) => ({ label: c.category!, count: c._count._all })).sort((a, b) => b.count - a.count),
    sentiments: sentiments.map((s) => ({ label: s.sentiment!, count: s._count._all })),
    series,
  };
}
