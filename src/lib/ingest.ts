import "server-only";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { db } from "@/lib/db";
import { aiEnabled, embed, embedModel } from "@/lib/ai/openrouter";
import { chunkText, htmlToText } from "@/lib/ai/text";

const MAX_BYTES = 2_000_000;
const EMBED_BATCH = 32;

function isPrivateAddress(ip: string) {
  if (ip.includes(":")) {
    const v6 = ip.toLowerCase();
    return v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("::ffff:127.");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** SSRF guard: only fetch public http(s) URLs. */
async function assertPublicUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) URLs are supported");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private URLs are not allowed");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error("Private URLs are not allowed");
  return url;
}

export async function fetchPage(rawUrl: string) {
  // Follow redirects manually so every hop is re-checked against the SSRF guard.
  let url = await assertPublicUrl(rawUrl);
  let res: Response | null = null;
  for (let hop = 0; hop < 4; hop++) {
    res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "SupportIQ-Ingest/1.0", Accept: "text/html,text/plain" },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    break;
  }
  if (!res || !res.ok) throw new Error(`Fetch failed with HTTP ${res?.status ?? "redirect loop"}`);
  const type = res.headers.get("content-type") ?? "";
  if (!/text\/(html|plain|markdown)/.test(type)) throw new Error(`Unsupported content type: ${type || "unknown"}`);
  const body = (await res.text()).slice(0, MAX_BYTES);
  if (type.includes("html")) return htmlToText(body);
  return { title: null, text: body };
}

/**
 * Ingestion pipeline: (fetch) → chunk → embed → store.
 * Re-running replaces the document's chunks, so it doubles as "re-index".
 */
export async function ingestDocument(documentId: string) {
  const doc = await db.document.findUniqueOrThrow({ where: { id: documentId } });
  try {
    let content = doc.content;
    let title = doc.title;
    if (doc.sourceType === "URL" && doc.sourceUrl) {
      const page = await fetchPage(doc.sourceUrl);
      content = page.text;
      if (page.title && (!title || title === doc.sourceUrl)) title = page.title.slice(0, 200);
    }
    const chunks = chunkText(content);
    if (chunks.length === 0) throw new Error("No readable text found");

    // Embed in batches. Without an API key we store chunks for keyword search only.
    const vectors: (number[] | null)[] = [];
    if (aiEnabled()) {
      for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
        const batch = chunks.slice(i, i + EMBED_BATCH).map((c) => `${title}\n\n${c}`);
        const out = await embed(batch);
        vectors.push(...(out ?? batch.map(() => null)));
      }
    } else {
      vectors.push(...chunks.map(() => null));
    }
    const model = aiEnabled() ? embedModel() : null;

    await db.$transaction(async (tx) => {
      await tx.chunk.deleteMany({ where: { documentId: doc.id } });
      for (let i = 0; i < chunks.length; i++) {
        const v = vectors[i];
        const literal = v ? `[${v.join(",")}]` : null;
        await tx.$executeRaw`
          INSERT INTO "Chunk" (id, "documentId", "botId", index, content, embedding, "embeddingModel")
          VALUES (${randomUUID()}, ${doc.id}, ${doc.botId}, ${i}, ${chunks[i]}, ${literal}::vector, ${v ? model : null})`;
      }
      await tx.document.update({
        where: { id: doc.id },
        data: { status: "READY", error: null, chunkCount: chunks.length, content, title },
      });
    }, { timeout: 60_000 });
  } catch (err) {
    console.error("[ingest] failed", doc.id, err);
    await db.document.update({
      where: { id: doc.id },
      data: { status: "FAILED", error: (err as Error).message.slice(0, 300) },
    });
  }
}
