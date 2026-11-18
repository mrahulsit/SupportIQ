/**
 * Thin OpenRouter client (OpenAI-compatible API) for chat completions,
 * streaming and embeddings. All model calls go through the server, so the
 * API key never reaches the browser.
 */
const BASE_URL = "https://openrouter.ai/api/v1";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type CompletionOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export class AIError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export function aiEnabled() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function chatModel() {
  return process.env.OPENROUTER_CHAT_MODEL || "google/gemma-4-31b-it:free";
}

export function embedModel() {
  return process.env.OPENROUTER_EMBED_MODEL || "nvidia/nemotron-3.5-embed-1b:free";
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "SupportIQ",
  };
}

async function post(path: string, body: unknown, signal?: AbortSignal) {
  if (!aiEnabled()) throw new AIError("OPENROUTER_API_KEY is not set");
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AIError(`OpenRouter ${res.status}: ${text.slice(0, 300)}`, res.status);
  }
  return res;
}

/** Non-streaming completion. Returns the assistant text. */
export async function complete(messages: ChatMessage[], opts: CompletionOptions = {}) {
  const res = await post(
    "/chat/completions",
    {
      model: opts.model ?? chatModel(),
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 700,
    },
    opts.signal,
  );
  const json = await res.json();
  if (json.error) throw new AIError(json.error.message ?? "OpenRouter error");
  const content: string | undefined = json.choices?.[0]?.message?.content;
  if (!content) throw new AIError("Model returned an empty response");
  return content.trim();
}

/** Streaming completion: yields text deltas as they arrive (SSE). */
export async function* stream(
  messages: ChatMessage[],
  opts: CompletionOptions = {},
): AsyncGenerator<string> {
  const res = await post(
    "/chat/completions",
    {
      model: opts.model ?? chatModel(),
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 700,
      stream: true,
    },
    opts.signal,
  );
  if (!res.body) throw new AIError("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      // OpenRouter sends ": OPENROUTER PROCESSING" keep-alive comments
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        if (json.error) throw new AIError(json.error.message ?? "Stream error");
        const delta: string | undefined = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch (err) {
        if (err instanceof AIError) throw err;
        // ignore partial / non-JSON lines
      }
    }
  }
}

/** Embeds a batch of texts. Returns null when AI is disabled. */
export async function embed(texts: string[]): Promise<number[][] | null> {
  if (!aiEnabled() || texts.length === 0) return null;
  const res = await post("/embeddings", { model: embedModel(), input: texts });
  const json = await res.json();
  const data: { embedding: number[]; index: number }[] | undefined = json.data;
  if (!data || data.length !== texts.length) throw new AIError("Unexpected embeddings response");
  return data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
