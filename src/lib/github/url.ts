import type { RepoRef } from "../types";

// GitHub rules: owner 1-39 chars, alphanumeric or single hyphens, no leading hyphen.
// Repo names: letters, digits, '.', '-', '_' (max 100). "." and ".." are not valid.
const OWNER_RE = /^(?!-)[A-Za-z0-9-]{1,39}$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

/** Paths under github.com that are not owners. */
const RESERVED_OWNERS = new Set([
  "about", "account", "apps", "blog", "collections", "contact", "customer-stories",
  "enterprise", "events", "explore", "features", "issues", "login", "logout",
  "marketplace", "new", "notifications", "orgs", "organizations", "pricing", "pulls",
  "search", "security", "settings", "site", "sponsors", "topics", "trending", "users",
]);

export type ParseResult =
  | { ok: true; ref: RepoRef }
  | { ok: false; error: string };

export function isValidOwner(owner: string): boolean {
  return OWNER_RE.test(owner) && !owner.includes("--") && !RESERVED_OWNERS.has(owner.toLowerCase());
}

export function isValidRepoName(repo: string): boolean {
  return REPO_RE.test(repo) && repo !== "." && repo !== "..";
}

/**
 * Parse anything a user might paste: full URLs, URLs with /tree/... suffixes,
 * `git@github.com:owner/repo.git`, or plain `owner/repo`.
 */
export function parseRepoInput(raw: string): ParseResult {
  const input = (raw ?? "").trim();
  if (!input) return { ok: false, error: "Paste a GitHub repository URL, like https://github.com/vercel/next.js" };
  if (input.length > 300) return { ok: false, error: "That input is too long to be a GitHub repository URL." };

  if (/\s/.test(input)) return { ok: false, error: "That doesn't look like a GitHub URL. Try github.com/owner/repo" };

  let path: string;

  const ssh = input.match(/^git@github\.com:(.+)$/i);
  if (ssh) {
    path = ssh[1];
  } else if (/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/?$/.test(input)) {
    path = input;
  } else {
    let url: URL;
    try {
      url = new URL(/^[a-z]+:\/\//i.test(input) ? input : `https://${input}`);
    } catch {
      return { ok: false, error: "That doesn't look like a valid URL." };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false, error: "Only http(s) GitHub URLs are supported." };
    }
    const host = url.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") {
      return { ok: false, error: "RepoQuest currently supports repositories hosted on github.com only." };
    }
    path = url.pathname;
  }

  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) {
    return { ok: false, error: "The URL needs both an owner and a repository name, e.g. github.com/owner/repo" };
  }
  const owner = decodeSafe(segments[0]);
  const repo = decodeSafe(segments[1]).replace(/\.git$/i, "");

  if (!owner || !isValidOwner(owner)) {
    return { ok: false, error: `"${segments[0]}" is not a valid GitHub user or organization name.` };
  }
  if (!repo || !isValidRepoName(repo)) {
    return { ok: false, error: `"${segments[1]}" is not a valid GitHub repository name.` };
  }
  return { ok: true, ref: { owner, repo } };
}

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return "";
  }
}

export function repoPath(ref: RepoRef): string {
  return `/r/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`;
}

export function githubBlobUrl(owner: string, repo: string, ref: string, path: string): string {
  return `https://github.com/${owner}/${repo}/blob/${encodeURIComponent(ref)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
