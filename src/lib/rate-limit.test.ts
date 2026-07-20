import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

const OPTS = { limit: 3, windowMs: 60_000 };

beforeEach(() => resetRateLimits());

describe("rateLimit", () => {
  it("allows up to the limit within a window, then blocks", () => {
    const t0 = 1_000_000;
    expect(rateLimit("k", OPTS, t0)).toBe(true);
    expect(rateLimit("k", OPTS, t0 + 1)).toBe(true);
    expect(rateLimit("k", OPTS, t0 + 2)).toBe(true);
    expect(rateLimit("k", OPTS, t0 + 3)).toBe(false);
  });

  it("resets after the window elapses", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit("k", OPTS, t0 + i);
    expect(rateLimit("k", OPTS, t0 + 5)).toBe(false);
    expect(rateLimit("k", OPTS, t0 + 60_001)).toBe(true);
  });

  it("tracks keys independently", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit("a", OPTS, t0 + i);
    expect(rateLimit("a", OPTS, t0 + 4)).toBe(false);
    expect(rateLimit("b", OPTS, t0 + 4)).toBe(true);
  });
});
