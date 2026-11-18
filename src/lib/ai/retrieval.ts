import "server-only";
import { db } from "@/lib/db";
import { aiEnabled, embed, embedModel } from "./openrouter";
import { reciprocalRankFusion, termCoverage, toOrTsQuery } from "./text";

export type RetrievedChunk = {
  id: string;
  documentId: string;
  title: string;
  sourceUrl: string | null;
  content: string;
  similarity: number | null;
  score: number;
};

export type RetrievalResult = {
  chunks: RetrievedChunk[];
  /** 0..1 heuristic: how well the knowledge base covers the question */
  confidence: number;
  mode: "hybrid" | "keyword";
};

type Row = {
  id: string;
  documentId: string;
  title: string;
  sourceUrl: string | null;
  content: string;
  similarity?: number;
};

const CANDIDATES = 20;

/**
 * Hybrid search over a bot's knowledge base:
 *  1. keyword search with Postgres full-text search (GIN index)
 *  2. semantic search with pgvector cosine distance (when embeddings are on)
 * Results are merged with Reciprocal Rank Fusion.
 */
export async function searchKnowledge(botId: string, query: string, limit = 4): Promise<RetrievalResult> {
  const tsQuery = toOrTsQuery(query);

  const keywordRows: Row[] = tsQuery
    ? await db.$queryRaw<Row[]>`
        SELECT c.id, c."documentId", d.title, d."sourceUrl", c.content
        FROM "Chunk" c
        JOIN "Document" d ON d.id = c."documentId"
        WHERE c."botId" = ${botId}
          AND to_tsvector('english', c.content) @@ to_tsquery('english', ${tsQuery})
        ORDER BY ts_rank_cd(to_tsvector('english', c.content), to_tsquery('english', ${tsQuery})) DESC
        LIMIT ${CANDIDATES}`
    : [];

  let vectorRows: Row[] = [];
  if (aiEnabled()) {
    try {
      const [vector] = (await embed([query])) ?? [];
      if (vector) {
        const literal = `[${vector.join(",")}]`;
        vectorRows = await db.$queryRaw<Row[]>`
          SELECT c.id, c."documentId", d.title, d."sourceUrl", c.content,
                 1 - (c.embedding <=> ${literal}::vector) AS similarity
          FROM "Chunk" c
          JOIN "Document" d ON d.id = c."documentId"
          WHERE c."botId" = ${botId}
            AND c.embedding IS NOT NULL
            AND c."embeddingModel" = ${embedModel()}
          ORDER BY c.embedding <=> ${literal}::vector
          LIMIT ${CANDIDATES}`;
      }
    } catch (err) {
      // Embedding outages degrade to keyword-only search instead of failing the chat.
      console.warn("[retrieval] vector search unavailable:", (err as Error).message);
    }
  }

  const byId = new Map<string, Row>();
  for (const r of [...vectorRows, ...keywordRows]) {
    const existing = byId.get(r.id);
    byId.set(r.id, { ...r, similarity: existing?.similarity ?? r.similarity });
  }

  const fused = reciprocalRankFusion([vectorRows.map((r) => r.id), keywordRows.map((r) => r.id)]);
  const chunks = [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => {
      const r = byId.get(id)!;
      return { ...r, similarity: r.similarity != null ? Number(r.similarity) : null, score };
    });

  return { chunks, confidence: confidenceFor(query, chunks), mode: vectorRows.length ? "hybrid" : "keyword" };
}

function confidenceFor(query: string, chunks: RetrievedChunk[]) {
  if (chunks.length === 0) return 0;
  const coverage = Math.max(...chunks.slice(0, 2).map((c) => termCoverage(query, `${c.title} ${c.content}`)));
  const sims = chunks.map((c) => c.similarity).filter((s): s is number => s != null);
  if (sims.length === 0) return Number(coverage.toFixed(2));
  const topSim = Math.max(...sims);
  return Number(Math.min(1, 0.6 * topSim + 0.4 * coverage).toFixed(2));
}

/** Below this, the assistant treats the question as a knowledge gap. */
export const CONFIDENCE_THRESHOLD = 0.34;
