/**
 * Re-indexes every knowledge-base document (re-chunks and re-embeds).
 * Run after adding OPENROUTER_API_KEY or changing OPENROUTER_EMBED_MODEL:
 *   npm run db:reindex
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { ingestDocument } from "../src/lib/ingest";
import { aiEnabled, embedModel } from "../src/lib/ai/openrouter";

async function main() {
  const docs = await db.document.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "asc" } });
  console.log(`Re-indexing ${docs.length} documents ${aiEnabled() ? `with ${embedModel()}` : "(keyword-only: no API key)"}…`);
  for (const d of docs) {
    await ingestDocument(d.id);
    const doc = await db.document.findUniqueOrThrow({ where: { id: d.id }, select: { status: true, chunkCount: true, error: true } });
    console.log(` ${doc.status === "READY" ? "✓" : "✗"} ${d.title} — ${doc.chunkCount} passages${doc.error ? ` (${doc.error})` : ""}`);
  }
  const [{ embedded, total }] = await db.$queryRaw<{ embedded: bigint; total: bigint }[]>`
    SELECT count(embedding) AS embedded, count(*) AS total FROM "Chunk"`;
  console.log(`Done: ${embedded}/${total} passages have embeddings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
