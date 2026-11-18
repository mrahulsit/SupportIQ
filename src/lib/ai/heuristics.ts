/**
 * Offline fallbacks used when no OpenRouter key is configured or the model
 * call fails, so the product keeps working (degraded, never broken).
 */
import { bestSentences } from "./text";

export type Triage = {
  summary: string;
  category: "billing" | "technical" | "account" | "sales" | "feedback" | "other";
  sentiment: "positive" | "neutral" | "negative";
  priority: "low" | "medium" | "high" | "urgent";
  needs_human: boolean;
};

const CATEGORY_RULES: [Triage["category"], RegExp][] = [
  ["billing", /\b(refund|invoice|charge|charged|billing|payment|price|pricing|plan|subscription|card|receipt)\b/i],
  ["technical", /\b(error|bug|broken|crash|not working|doesn'?t work|install|embed|api|widget|script|integrat\w*|slow|down)\b/i],
  ["account", /\b(password|login|log in|sign in|account|email|2fa|reset|delete my|username)\b/i],
  ["sales", /\b(demo|trial|enterprise|quote|discount|buy|purchase|upgrade|sales)\b/i],
  ["feedback", /\b(feature request|suggest|feedback|love|hate|would be nice|wish)\b/i],
];

const NEGATIVE = /\b(angry|furious|terrible|awful|worst|useless|ridiculous|unacceptable|frustrat\w*|annoy\w*|disappoint\w*|scam|cancel|wtf|still not|again)\b/i;
const POSITIVE = /\b(thanks|thank you|great|awesome|perfect|love|amazing|helpful|works now)\b/i;
const URGENT = /\b(urgent|asap|emergency|outage|down for everyone|security|hacked|breach|charged twice|double charged)\b/i;
const BLOCKED = /\b(can'?t|cannot|unable|blocked|stuck|locked out|not working)\b/i;

export function heuristicTriage(customerText: string, firstQuestion: string): Triage {
  const category = CATEGORY_RULES.find(([, re]) => re.test(customerText))?.[0] ?? "other";
  const sentiment = NEGATIVE.test(customerText) ? "negative" : POSITIVE.test(customerText) ? "positive" : "neutral";
  const priority = URGENT.test(customerText)
    ? "urgent"
    : BLOCKED.test(customerText) || sentiment === "negative"
      ? "high"
      : category === "billing" || category === "account"
        ? "medium"
        : "low";
  const q = firstQuestion.length > 140 ? `${firstQuestion.slice(0, 137)}…` : firstQuestion;
  return {
    summary: q,
    category,
    sentiment,
    priority,
    needs_human: sentiment === "negative" && priority !== "low",
  };
}

/** Extractive answer built from the best-matching knowledge-base passages. */
export function extractiveAnswer(question: string, chunks: { title: string; content: string }[]): string {
  if (chunks.length === 0) {
    return "I couldn't find that in our help articles. Would you like me to connect you with a teammate? Just tap **Talk to a human**.";
  }
  const lines = bestSentences(question, chunks[0].content, 3);
  let answer = `${lines.join(" ")} [1]`;
  if (chunks[1]) {
    // only add a second passage when it genuinely matches the question
    const extra = bestSentences(question, chunks[1].content, 1, true)[0];
    if (extra && !answer.includes(extra)) answer += `\n\n${extra} [2]`;
  }
  return answer;
}
