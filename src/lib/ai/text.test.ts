import { describe, expect, it } from "vitest";
import {
  bestSentences,
  calibrateSimilarity,
  chunkText,
  extractJson,
  htmlToText,
  keywords,
  reciprocalRankFusion,
  termCoverage,
  toOrTsQuery,
  wantsHuman,
} from "./text";

describe("keywords / toOrTsQuery", () => {
  it("drops stopwords and punctuation", () => {
    expect(keywords("How do I reset my password?")).toEqual(["reset", "password"]);
  });
  it("builds an OR tsquery", () => {
    expect(toOrTsQuery("refund policy for orders")).toBe("refund | policy | orders");
  });
  it("returns null when nothing is searchable", () => {
    expect(toOrTsQuery("how do I?")).toBeNull();
  });
});

describe("termCoverage", () => {
  it("is 1 when every keyword is present", () => {
    expect(termCoverage("refund policy", "Our refund policy lasts 30 days.")).toBe(1);
  });
  it("matches simple plurals", () => {
    expect(termCoverage("refunds", "We issue a refund within 5 days")).toBe(1);
  });
  it("is 0 for unrelated text", () => {
    expect(termCoverage("shipping times", "Passwords must be 8 characters")).toBe(0);
  });
});

describe("chunkText", () => {
  it("keeps short text as one chunk", () => {
    expect(chunkText("Hello world.")).toEqual(["Hello world."]);
  });
  it("splits long text into bounded, overlapping chunks", () => {
    const para = (n: number) => `Paragraph ${n}. ` + "Lorem ipsum dolor sit amet. ".repeat(12);
    const text = Array.from({ length: 8 }, (_, i) => para(i)).join("\n\n");
    const chunks = chunkText(text, 900, 150);
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(900);
    // overlap: the start of chunk 2 repeats text from the end of chunk 1
    const tail = chunks[0].slice(-60).split(" ").slice(2, 5).join(" ");
    expect(chunks[1]).toContain(tail);
  });
  it("hard-cuts a single giant sentence", () => {
    const chunks = chunkText("x".repeat(2500), 900, 100);
    expect(chunks.every((c) => c.length <= 900)).toBe(true);
    expect(chunks.join("").replace(/\s/g, "").length).toBeGreaterThanOrEqual(2500);
  });
});

describe("calibrateSimilarity", () => {
  it("maps the model's similarity band onto 0..1 and clamps", () => {
    expect(calibrateSimilarity(0.05, 0.1, 0.35)).toBe(0);
    expect(calibrateSimilarity(0.225, 0.1, 0.35)).toBeCloseTo(0.5);
    expect(calibrateSimilarity(0.6, 0.1, 0.35)).toBe(1);
  });
});

describe("greetings are not knowledge gaps", () => {
  it.each(["hi", "Hello!", "thanks", "thank you"])("%s has no searchable keywords", (msg) => expect(keywords(msg)).toEqual([]));
});

describe("reciprocalRankFusion", () => {
  it("rewards items ranked well in both lists", () => {
    const scores = reciprocalRankFusion([
      ["a", "b", "c"],
      ["b", "a", "d"],
    ]);
    const ranked = [...scores.entries()].sort((x, y) => y[1] - x[1]).map(([id]) => id);
    expect(ranked.slice(0, 2).sort()).toEqual(["a", "b"]);
    expect(scores.get("d")).toBeLessThan(scores.get("a")!);
  });
});

describe("htmlToText", () => {
  it("extracts title and readable text, dropping scripts and nav", () => {
    const html = `<html><head><title>Refunds &amp; Returns</title></head><body>
      <nav>Home | Pricing</nav><main><h1>Refunds</h1><p>We refund within <b>30</b> days.</p>
      <script>alert(1)</script><ul><li>Keep the receipt</li></ul></main></body></html>`;
    const { title, text } = htmlToText(html);
    expect(title).toBe("Refunds & Returns");
    expect(text).toContain("We refund within 30 days.");
    expect(text).toContain("- Keep the receipt");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("Pricing");
  });
});

describe("extractJson", () => {
  it("parses fenced JSON", () => {
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });
  it("finds JSON inside prose, including braces in strings", () => {
    expect(extractJson('Sure! {"summary": "uses {curly} braces", "n": 2} hope that helps')).toEqual({
      summary: "uses {curly} braces",
      n: 2,
    });
  });
  it("returns null for invalid output", () => {
    expect(extractJson("no json here")).toBeNull();
    expect(extractJson("{ broken: ")).toBeNull();
  });
});

describe("wantsHuman", () => {
  it.each(["Can I talk to a human?", "I want to speak with someone", "get me a real person", "live agent please"])(
    "detects %s",
    (msg) => expect(wantsHuman(msg)).toBe(true),
  );
  it.each(["How do humans use this?".replace("humans", "teams"), "What does the agent copilot do?"])("ignores %s", (msg) =>
    expect(wantsHuman(msg)).toBe(false),
  );
});

describe("bestSentences", () => {
  it("picks the sentences matching the question, in original order", () => {
    const passage =
      "SupportIQ is a support platform. Refunds are processed within five business days. Contact us any time. Refunds go back to the original card.";
    expect(bestSentences("how long do refunds take", passage, 2)).toEqual([
      "Refunds are processed within five business days.",
      "Refunds go back to the original card.",
    ]);
  });
});
