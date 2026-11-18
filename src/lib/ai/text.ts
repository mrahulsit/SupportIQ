/**
 * Pure text utilities used by ingestion and retrieval (unit-tested, no I/O).
 */

const STOPWORDS = new Set(
  "a an and are as at be but by can do does for from has have how i if in is it its me my no not of on or our please so that the their them then there these they this to us was we what when where which who why will with you your hi hello hey thanks thank".split(
    " ",
  ),
);

/** Lower-cased content words of a query, stopwords removed. */
export function keywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter((w) => w.length > 1 && !STOPWORDS.has(w)) ?? [],
    ),
  );
}

/** Builds an OR tsquery ("refund | policy") from free text, or null if nothing searchable. */
export function toOrTsQuery(text: string): string | null {
  const words = keywords(text).slice(0, 12);
  return words.length ? words.join(" | ") : null;
}

/** Fraction of the query's keywords that appear in the passage (0..1). */
export function termCoverage(query: string, passage: string): number {
  const q = keywords(query);
  if (q.length === 0) return 0;
  const p = new Set(keywords(passage));
  // allow simple plural/suffix matches ("refunds" ~ "refund")
  const hit = q.filter((w) => p.has(w) || [...p].some((x) => x.startsWith(w) || w.startsWith(x) && x.length > 3));
  return hit.length / q.length;
}

/**
 * Splits a document into overlapping chunks along paragraph and sentence
 * boundaries so each chunk is a self-contained passage for retrieval.
 */
export function chunkText(text: string, size = 900, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  // Break into units no longer than `size`: paragraphs, then sentences, then hard cuts.
  const units: string[] = [];
  for (const para of clean.split(/\n\n+/)) {
    if (para.length <= size) {
      units.push(para);
      continue;
    }
    for (const sentence of para.split(/(?<=[.!?])\s+/)) {
      if (sentence.length <= size) units.push(sentence);
      else for (let i = 0; i < sentence.length; i += size) units.push(sentence.slice(i, i + size));
    }
  }

  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (current && current.length + unit.length + 2 > size) {
      chunks.push(current.trim());
      // carry the tail of the previous chunk forward for context
      const tail = current.slice(-overlap);
      const cut = tail.indexOf(" ");
      const carry = cut >= 0 ? tail.slice(cut + 1) : tail;
      // never let the carried overlap push a chunk past `size`
      current = carry && carry.length + unit.length + 2 <= size ? `${carry}\n\n${unit}` : unit;
    } else {
      current = current ? `${current}\n\n${unit}` : unit;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Reciprocal Rank Fusion: merges several ranked id lists into one score map.
 * score(id) = Σ 1 / (k + rank)
 */
export function reciprocalRankFusion(lists: string[][], k = 60): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return scores;
}

/** Strips HTML to readable text (good enough for help-centre / docs pages). */
export function htmlToText(html: string): { title: string | null; text: string } {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
  const body = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
  const text = body
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br|blockquote|pre)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*(\n\s*)+/g, "\n\n")
    .trim();
  return { title: title ? decodeTitle(title) : null, text };
}

function decodeTitle(t: string) {
  return t.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
}

/** Extracts the first JSON object from model output (handles ```json fences and prose). */
export function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced ?? text;
  const start = source.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(source.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** True when the visitor is explicitly asking for a person. */
export function wantsHuman(message: string): boolean {
  return /\b(human|real person|live (agent|chat|person)|(talk|speak|chat) (to|with) (a |an |some)?(one|person|agent|someone|somebody|representative|support|staff)|customer (service|care) (agent|rep)|representative)\b/i.test(
    message,
  );
}

/** Picks the sentences of a passage that best match the query (offline answers). */
export function bestSentences(query: string, passage: string, max = 3, strict = false): string[] {
  const q = keywords(query);
  const sentences = passage
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  const scored = sentences.map((s, i) => {
    const words = new Set(keywords(s));
    const score = q.filter((w) => words.has(w) || [...words].some((x) => x.startsWith(w))).length;
    return { s, i, score };
  });
  const top = scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .sort((a, b) => a.i - b.i);
  return (top.length || strict ? top : scored.slice(0, 2)).map((x) => x.s);
}
