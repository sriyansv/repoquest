import { describe, it, expect } from "vitest";
import { RateLimiter, LruCache, clientKey } from "@/lib/ratelimit";

describe("RateLimiter", () => {
  it("allows up to max then blocks with retryAfter", () => {
    const rl = new RateLimiter(2, 60_000);
    expect(rl.check("k", 0).ok).toBe(true);
    expect(rl.check("k", 1000).ok).toBe(true);
    const r = rl.check("k", 10_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBe(50);
  });
  it("resets after the window", () => {
    const rl = new RateLimiter(1, 1000);
    rl.check("k", 0);
    expect(rl.check("k", 999).ok).toBe(false);
    expect(rl.check("k", 1000).ok).toBe(true);
  });
  it("keys are independent", () => {
    const rl = new RateLimiter(1, 1000);
    rl.check("a", 0);
    expect(rl.check("b", 0).ok).toBe(true);
  });
});

describe("LruCache", () => {
  it("evicts least recently used", () => {
    const c = new LruCache<number>(2);
    c.set("a", 1); c.set("b", 2);
    c.get("a");
    c.set("c", 3);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe(1);
    expect(c.get("c")).toBe(3);
  });
  it("overwriting refreshes recency and value", () => {
    const c = new LruCache<number>(2);
    c.set("a", 1); c.set("b", 2); c.set("a", 10); c.set("c", 3);
    expect(c.get("a")).toBe(10);
    expect(c.get("b")).toBeUndefined();
  });
});

describe("clientKey", () => {
  it("uses first x-forwarded-for entry", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": " 1.2.3.4 , 5.6.7.8" }))).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip then anonymous", () => {
    expect(clientKey(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientKey(new Headers())).toBe("anonymous");
  });
});
