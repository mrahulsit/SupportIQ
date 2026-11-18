import { describe, expect, it } from "vitest";
import { extractiveAnswer, heuristicTriage } from "./heuristics";
import { buildAnswerMessages, historyToTurns } from "./prompts";

describe("heuristicTriage", () => {
  it("flags urgent billing problems from angry customers", () => {
    const t = heuristicTriage("I was charged twice and this is unacceptable", "I was charged twice");
    expect(t).toMatchObject({ category: "billing", sentiment: "negative", priority: "urgent", needs_human: true });
  });
  it("treats a simple how-to as low priority", () => {
    const t = heuristicTriage("How do I embed the widget?", "How do I embed the widget?");
    expect(t).toMatchObject({ category: "technical", sentiment: "neutral", priority: "low", needs_human: false });
  });
});

describe("extractiveAnswer", () => {
  it("offers a human when nothing was retrieved", () => {
    expect(extractiveAnswer("anything", [])).toMatch(/Talk to a human/);
  });
  it("cites the passage it quotes", () => {
    const a = extractiveAnswer("refund window", [{ title: "Refunds", content: "Our refund window is 30 days from purchase. Shipping is free." }]);
    expect(a).toContain("refund window is 30 days");
    expect(a).toContain("[1]");
  });
});

describe("prompts", () => {
  it("numbers context excerpts and appends the question last", () => {
    const msgs = buildAnswerMessages(
      { name: "Acme", systemPrompt: "Be nice." },
      [{ role: "USER", content: "hi" }, { role: "ASSISTANT", content: "hello" }],
      [{ id: "1", documentId: "d", title: "Refunds", sourceUrl: null, content: "30 days", similarity: 0.8, score: 1 }],
      "refund window?",
    );
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toContain("[1] Refunds\n30 days");
    expect(msgs.at(-1)).toEqual({ role: "user", content: "refund window?" });
  });
  it("drops system notes and keeps only recent history", () => {
    const history = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? ("ASSISTANT" as const) : ("USER" as const), content: `m${i}` }));
    const turns = historyToTurns([{ role: "SYSTEM", content: "note" }, ...history], 10);
    expect(turns).toHaveLength(10);
    expect(turns.some((t) => t.content === "note")).toBe(false);
  });
});
