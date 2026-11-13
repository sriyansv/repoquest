import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { clientKey, RateLimiter } from "../ratelimit";
import type { RepoAnalysis } from "../types";
import { GitHubError } from "./client";
import { analyzeRepo } from "./repo";

/**
 * On a public deployment every visitor shares the server's GITHUB_TOKEN quota
 * (5,000 requests/hour). These per-IP limits stop one client from exhausting
 * it for everyone. They are in-memory per server instance (best effort).
 */
const WINDOW_MS = 10 * 60 * 1000;
// 60 per 10 minutes leaves room for a classroom sharing one NAT address; raise it for workshops.
const analysisLimiter = new RateLimiter(Number(process.env.ANALYSIS_RATE_LIMIT_PER_10_MIN) || 60, WINDOW_MS);
export const fileLimiter = new RateLimiter(Number(process.env.FILE_RATE_LIMIT_PER_10_MIN) || 300, WINDOW_MS);

export function limitError(retryAfterSec: number, what: string): GitHubError {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return new GitHubError(
    "rate_limited",
    `You're ${what} very quickly. To keep RepoQuest available for everyone, please wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`,
    429,
    new Date(Date.now() + retryAfterSec * 1000).toISOString(),
  );
}

/**
 * Analysis for the current page request. React's cache() makes the limit count
 * once per request, even though generateMetadata and the page both call this.
 */
export const analyzeRepoForRequest = cache(async (owner: string, repo: string): Promise<RepoAnalysis> => {
  const check = analysisLimiter.check(clientKey(await headers()));
  if (!check.ok) throw limitError(check.retryAfterSec, "exploring repositories");
  return analyzeRepo(owner, repo);
});
