import "server-only";
import { cache } from "react";
import { assembleAnalysis, MANIFEST_FILES, type RawRepoData } from "../analysis/assemble";
import type { GitHubIssue } from "../analysis/issues";
import { detectEntryPoints, selectFilesToAnalyze } from "../analysis/structure";
import type { RepoAnalysis, RepoMeta, RepoRef, SourceFile, TreeEntry } from "../types";
import { fetchRawFile, getLastRateLimit, githubApi, GitHubError, mapLimit } from "./client";
import { isValidOwner, isValidRepoName } from "./url";

/** Upper bound on tree entries sent to the browser. */
const MAX_TREE_ENTRIES = 15_000;
const FILES_TO_ANALYZE = 80;

interface GhRepo {
  name: string;
  full_name: string;
  owner: { login: string; avatar_url: string };
  description: string | null;
  homepage: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: { spdx_id: string | null; name: string } | null;
  topics?: string[];
  language: string | null;
  html_url: string;
  pushed_at: string | null;
  archived: boolean;
  fork: boolean;
  size: number;
  private: boolean;
}

interface GhTree {
  sha: string;
  truncated: boolean;
  tree: { path: string; type: "blob" | "tree" | "commit"; size?: number }[];
}

export async function fetchRepoMeta(ref: RepoRef): Promise<RepoMeta> {
  if (!isValidOwner(ref.owner) || !isValidRepoName(ref.repo)) {
    throw new GitHubError("invalid", "That is not a valid GitHub repository name.");
  }
  const r = await githubApi<GhRepo>(`/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`);
  if (!r) throw new GitHubError("not_found", "Repository not found.");
  if (r.private) throw new GitHubError("forbidden", "RepoQuest only explores public repositories.");
  return {
    owner: r.owner.login,
    repo: r.name,
    fullName: r.full_name,
    description: r.description?.trim() || null,
    homepage: r.homepage?.trim() || null,
    defaultBranch: r.default_branch,
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    license: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : r.license?.name ?? null,
    topics: r.topics ?? [],
    primaryLanguage: r.language,
    ownerAvatar: r.owner.avatar_url,
    htmlUrl: r.html_url,
    pushedAt: r.pushed_at,
    archived: r.archived,
    fork: r.fork,
    sizeKb: r.size,
  };
}

async function fetchIssues(meta: RepoMeta): Promise<{ issues: GitHubIssue[] | null; error: string | null }> {
  const base = `/repos/${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repo)}/issues?state=open&per_page=50`;
  try {
    // Two calls: issues explicitly labelled for newcomers, plus recent open issues
    // (many projects use custom labels, so we assess content for both sets).
    const [labelled, recent] = await Promise.all([
      githubApi<GitHubIssue[]>(`${base}&labels=${encodeURIComponent("good first issue")}`, { allow404: true }),
      githubApi<GitHubIssue[]>(`${base}&sort=updated`, { allow404: true }),
    ]);
    return { issues: [...(labelled ?? []), ...(recent ?? [])], error: null };
  } catch (err) {
    return { issues: null, error: err instanceof GitHubError ? err.message : "Could not load issues." };
  }
}

/**
 * Fetch everything needed to analyze a repository.
 * API cost: ~6 REST calls (repo, tree, readme, languages, 2× issues). File
 * contents come from raw.githubusercontent.com, which is not rate limited
 * the same way.
 */
export async function fetchRepoData(ref: RepoRef): Promise<RawRepoData> {
  const meta = await fetchRepoMeta(ref);
  const notices: string[] = [];
  const o = encodeURIComponent(meta.owner);
  const r = encodeURIComponent(meta.repo);
  const branch = meta.defaultBranch;

  const [treeRes, readmeRes, langs, issueRes] = await Promise.all([
    githubApi<GhTree>(`/repos/${o}/${r}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { allow404: true }),
    githubApi<{ path: string; content: string; encoding: string }>(`/repos/${o}/${r}/readme`, { allow404: true }),
    githubApi<Record<string, number>>(`/repos/${o}/${r}/languages`, { allow404: true }).catch(() => null),
    fetchIssues(meta),
  ]);

  let tree: TreeEntry[] = (treeRes?.tree ?? [])
    .filter((e) => e.type === "blob" || e.type === "tree")
    .map((e) => ({ path: e.path, type: e.type as "blob" | "tree", ...(e.type === "blob" ? { size: e.size ?? 0 } : {}) }));
  let treeTruncated = Boolean(treeRes?.truncated);
  if (!treeRes) notices.push("This repository appears to be empty.");
  if (tree.length > MAX_TREE_ENTRIES) {
    tree = tree.slice(0, MAX_TREE_ENTRIES);
    treeTruncated = true;
  }
  if (treeTruncated) notices.push(`Large repository: only the first ${tree.length.toLocaleString("en-US")} paths are shown.`);

  let readme: RawRepoData["readme"] = null;
  if (readmeRes?.content && readmeRes.encoding === "base64") {
    readme = { path: readmeRes.path, content: Buffer.from(readmeRes.content, "base64").toString("utf8").slice(0, 100_000) };
  }

  const blobPaths = new Set(tree.filter((e) => e.type === "blob").map((e) => e.path));
  const manifestNames = MANIFEST_FILES.filter((m) => blobPaths.has(m));
  const manifestContents = await mapLimit(manifestNames, 6, (m) => fetchRawFile(meta.owner, meta.repo, branch, m, 300_000));
  const manifests: Record<string, string | null> = {};
  manifestNames.forEach((m, i) => (manifests[m] = manifestContents[i]));

  const entryPoints = detectEntryPoints(tree, {
    packageJson: manifests["package.json"],
    pyproject: manifests["pyproject.toml"],
    cargoToml: manifests["Cargo.toml"],
    goMod: manifests["go.mod"],
  });
  const toRead = selectFilesToAnalyze(tree, entryPoints, FILES_TO_ANALYZE);
  const contents = await mapLimit(toRead, 10, (p) => fetchRawFile(meta.owner, meta.repo, branch, p, 120_000));
  const sourceFiles: SourceFile[] = [];
  toRead.forEach((path, i) => {
    const c = contents[i];
    if (c !== null) sourceFiles.push({ path, content: c, size: c.length });
  });
  const failed = toRead.length - sourceFiles.length;
  if (failed > 0) notices.push(`${failed} file${failed === 1 ? "" : "s"} could not be downloaded and were skipped.`);
  if (meta.archived) notices.push("This repository is archived by its owner and no longer accepts contributions.");

  return {
    meta,
    ref: branch,
    tree,
    treeTruncated,
    readme,
    githubLanguages: langs,
    manifests,
    sourceFiles,
    issues: issueRes.issues,
    issuesError: issueRes.error,
    rateLimit: getLastRateLimit(),
    notices,
  };
}

/** Request-deduplicated analysis (page + metadata + OG image share one fetch). */
export const analyzeRepo = cache(async (owner: string, repo: string): Promise<RepoAnalysis> => {
  const raw = await fetchRepoData({ owner, repo });
  return assembleAnalysis(raw);
});

/** Server-side file fetch for the preview/explain endpoints. Validates the path is in the tree. */
export async function fetchFileForPreview(
  owner: string,
  repo: string,
  path: string,
): Promise<{ meta: RepoMeta; content: string | null; reason?: string }> {
  const meta = await fetchRepoMeta({ owner, repo });
  if (!path || path.length > 1000 || path.split("/").some((s) => s === ".." || s === "." || s === "")) {
    throw new GitHubError("invalid", "Invalid file path.");
  }
  const content = await fetchRawFile(meta.owner, meta.repo, meta.defaultBranch, path, 400_000);
  return content === null ? { meta, content: null, reason: "This file is binary, too large to preview (400 KB limit), or could not be downloaded." } : { meta, content };
}
