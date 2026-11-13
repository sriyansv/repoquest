/**
 * Small in-memory fixed-window rate limiter and LRU cache.
 *
 * On serverless platforms each instance has its own memory, so this is a
 * best-effort guard against accidental abuse, not a hard global limit.
 * For a hard limit, put the AI endpoint behind a shared store (e.g. Upstash).
 */

export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(private max: number, private windowMs: number) {}

  check(key: string, now = Date.now()): { ok: boolean; retryAfterSec: number } {
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { ok: true, retryAfterSec: 0 };
    }
    if (entry.count >= this.max) return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
    entry.count++;
    return { ok: true, retryAfterSec: 0 };
  }
}

export class LruCache<V> {
  private map = new Map<string, V>();
  constructor(private max: number) {}
  get(key: string): V | undefined {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key: string, value: V) {
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }
}

export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? headers.get("x-real-ip") ?? "anonymous").trim();
}
