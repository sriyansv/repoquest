import "server-only";
import type { RateLimitInfo } from "../types";

/**
 * Minimal GitHub REST client.
 *
 * - Uses GITHUB_TOKEN (server-side only) when present: 5,000 req/h instead of 60.
 * - Every response's rate-limit headers are recorded so the UI can show them.
 * - Responses are cached by Next.js for REVALIDATE_SECONDS, so repeat visits
 *   to the same repository do not spend API quota.
 * - File contents are fetched from raw.githubusercontent.com, which does not
 *   count against the REST API rate limit.
 */

export const REVALIDATE_SECONDS = 60 * 30;
const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const TIMEOUT_MS = 15_000;

export type GitHubErrorKind =
  | "not_found"
  | "rate_limited"
  | "forbidden"
  | "unavailable"
  | "network"
  | "invalid";

export class GitHubError extends Error {
  constructor(
    public kind: GitHubErrorKind,
    message: string,
    public status?: number,
    public resetAt?: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

let lastRateLimit: RateLimitInfo | null = null;
export function getLastRateLimit(): RateLimitInfo | null {
  return lastRateLimit;
}

function token(): string | undefined {
  const t = process.env.GITHUB_TOKEN?.trim();
  return t ? t : undefined;
}

function recordRateLimit(res: Response) {
  const limit = Number(res.headers.get("x-ratelimit-limit"));
  const remaining = Number(res.headers.get("x-ratelimit-remaining"));
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(limit) && limit > 0 && Number.isFinite(remaining)) {
    lastRateLimit = {
      limit,
      remaining,
      resetAt: new Date((Number.isFinite(reset) ? reset : 0) * 1000).toISOString(),
      authenticated: Boolean(token()),
    };
  }
}

async function doFetch(url: string, init: RequestInit & { next?: { revalidate?: number } }): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new GitHubError(
      "network",
      timedOut ? "GitHub took too long to respond. Please try again." : "Could not reach GitHub. Check your connection and try again.",
    );
  }
}

export async function githubApi<T>(path: string, opts: { allow404?: boolean; accept?: string } = {}): Promise<T | null> {
  const headers: Record<string, string> = {
    Accept: opts.accept ?? "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RepoQuest",
  };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await doFetch(`${API}${path}`, { headers, next: { revalidate: REVALIDATE_SECONDS } });
  recordRateLimit(res);

  if (res.ok) {
    if (opts.accept?.includes("raw")) return (await res.text()) as T;
    return (await res.json()) as T;
  }
  if (res.status === 404) {
    if (opts.allow404) return null;
    throw new GitHubError("not_found", "Repository not found. It may be private, renamed, or deleted.", 404);
  }
  if (res.status === 451) {
    throw new GitHubError("unavailable", "This repository is unavailable for legal reasons.", 451);
  }
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    if (remaining === "0" || res.status === 429 || res.headers.has("retry-after")) {
      const resetAt = reset ? new Date(Number(reset) * 1000).toISOString() : undefined;
      throw new GitHubError(
        "rate_limited",
        t
          ? "GitHub's API rate limit has been reached. Please try again shortly."
          : "GitHub's anonymous API rate limit (60 requests/hour) has been reached. The site operator can set GITHUB_TOKEN to raise it.",
        res.status,
        resetAt,
      );
    }
    throw new GitHubError("forbidden", "GitHub denied access to this repository.", res.status);
  }
  if (res.status === 409 && opts.allow404) return null; // empty repository
  if (res.status >= 500) {
    throw new GitHubError("unavailable", "GitHub is having trouble right now. Please try again in a minute.", res.status);
  }
  throw new GitHubError("invalid", `GitHub returned an unexpected response (${res.status}).`, res.status);
}

/** Fetch a file's text. Returns null if it is missing, binary, or too large. */
export async function fetchRawFile(
  owner: string,
  repo: string,
  ref: string,
  path: string,
  maxBytes = 200_000,
): Promise<string | null> {
  const url = `${RAW}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  let res: Response;
  try {
    res = await doFetch(url, { headers: { "User-Agent": "RepoQuest" }, next: { revalidate: REVALIDATE_SECONDS } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const len = Number(res.headers.get("content-length"));
  if (Number.isFinite(len) && len > maxBytes) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength > maxBytes) return null;
  const bytes = new Uint8Array(buf);
  if (looksBinary(bytes)) return null;
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function looksBinary(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 8000);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return true;
  return false;
}

/** Run async tasks with bounded concurrency, preserving order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}
