import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  it("allows up to the limit inside the window, then blocks", () => {
    const rl = new RateLimiter(3, 1000);
    expect(rl.check("k", 0).ok).toBe(true);
    expect(rl.check("k", 10).ok).toBe(true);
    expect(rl.check("k", 20).ok).toBe(true);
    const blocked = rl.check("k", 30);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(970);
  });

  it("frees capacity as the window slides", () => {
    const rl = new RateLimiter(2, 1000);
    rl.check("k", 0);
    rl.check("k", 500);
    expect(rl.check("k", 900).ok).toBe(false);
    expect(rl.check("k", 1001).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const rl = new RateLimiter(1, 1000);
    expect(rl.check("a", 0).ok).toBe(true);
    expect(rl.check("b", 0).ok).toBe(true);
    expect(rl.check("a", 1).ok).toBe(false);
  });
});
