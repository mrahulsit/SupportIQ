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
  return process.env.OPENROUTER_CHAT_MODEL || "nvidia/nemotron-3.5-super-vl:free";
}

export function embedModel() {
  return process.env.OPENROUTER_EMBED_MODEL || "nvidia/nemotron-3-embed-1b:free";
}

/**
 * Model routing: OpenRouter tries `models` in order when one is down or
 * rate-limited, which keeps free-tier models usable in practice.
 */
function routing(model?: string) {
  const primary = model ?? chatModel();
  const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m && m !== primary);
  const models = fallbacks.length ? { models: [primary, ...fallbacks].slice(0, 3) } : {};
  // Reasoning ("thinking") models can burn the whole token budget before writing
  // an answer. Support replies are short and grounded, so thinking is off unless
  // OPENROUTER_REASONING=true. Models without reasoning ignore this field.
  const reasoning = { reasoning: { enabled: process.env.OPENROUTER_REASONING === "true" } };
  return { model: primary, ...models, ...reasoning };
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
    // Some models refuse requests with thinking disabled: retry once with a small
    // thinking budget and room left over for the actual answer.
    if (res.status === 400 && /reasoning is mandatory/i.test(text) && isChatBody(body) && body.reasoning?.enabled === false) {
      return post(path, { ...body, reasoning: { effort: "low" }, max_tokens: (body.max_tokens ?? 700) + 1500 }, signal);
    }
    throw new AIError(`OpenRouter ${res.status}: ${text.slice(0, 300)}`, res.status);
  }
  return res;
}

type ChatBody = { reasoning?: { enabled?: boolean }; max_tokens?: number };
function isChatBody(body: unknown): body is ChatBody {
  return typeof body === "object" && body !== null && "messages" in body;
}

/** Non-streaming completion. Returns the assistant text and the model that actually answered. */
export async function complete(messages: ChatMessage[], opts: CompletionOptions = {}) {
  const res = await post(
    "/chat/completions",
    {
      ...routing(opts.model),
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 700,
    },
    opts.signal,
  );
  const json = await res.json();
  if (json.error) throw new AIError(json.error.message ?? "OpenRouter error");
  const choice = json.choices?.[0];
  const content: string | undefined = choice?.message?.content;
  if (!content) {
    throw new AIError(
      choice?.finish_reason === "length"
        ? "Model hit the token limit before answering (reasoning model?)"
        : "Model returned an empty response",
    );
  }
  return { text: content.trim(), model: (json.model as string | undefined) ?? opts.model ?? chatModel() };
}

/** Streaming completion: yields text deltas as they arrive (SSE). */
export async function* stream(
  messages: ChatMessage[],
  opts: CompletionOptions & { onModel?: (model: string) => void } = {},
): AsyncGenerator<string> {
  const res = await post(
    "/chat/completions",
    {
      ...routing(opts.model),
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
        if (json.model && opts.onModel) {
          opts.onModel(json.model);
          opts.onModel = undefined;
        }
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
