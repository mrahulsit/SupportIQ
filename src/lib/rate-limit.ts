/**
 * Sliding-window rate limiter kept in process memory.
 * Good enough for a single instance; swap for Redis/Upstash when running several.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): { ok: boolean; retryAfterMs: number; remaining: number } {
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { ok: false, retryAfterMs: recent[0] + this.windowMs - now, remaining: 0 };
    }

    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.sweep(windowStart);
    return { ok: true, retryAfterMs: 0, remaining: this.limit - recent.length };
  }

  private sweep(windowStart: number) {
    for (const [k, times] of this.hits) {
      if (times.every((t) => t <= windowStart)) this.hits.delete(k);
    }
  }
}

const globalForLimiter = globalThis as unknown as { chatLimiter?: RateLimiter };

/** 20 messages per minute per visitor + IP. */
export const chatLimiter = globalForLimiter.chatLimiter ?? new RateLimiter(20, 60_000);
globalForLimiter.chatLimiter = chatLimiter;
