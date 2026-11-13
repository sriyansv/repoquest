import type { RateLimitInfo, RepoAnalysis, RepoMeta, SourceFile, TreeEntry } from "../types";
import { buildArchitecture } from "./graph";
import { rankIssues, type GitHubIssue } from "./issues";
import { computeLanguages, isSourceFile } from "./languages";
import { detectEntryPoints, isIgnoredPath, safeJson, type PackageJson } from "./structure";
import { buildSummary } from "./summary";

/** Manifest files we read when they exist at the repository root. */
export const MANIFEST_FILES = [
  "package.json", "tsconfig.json", "pyproject.toml", "requirements.txt", "Cargo.toml", "go.mod", "Makefile",
] as const;

export interface RawRepoData {
  meta: RepoMeta;
  ref: string;
  tree: TreeEntry[];
  treeTruncated: boolean;
  readme: { path: string; content: string } | null;
  githubLanguages: Record<string, number> | null;
  manifests: Record<string, string | null>;
  sourceFiles: SourceFile[];
  issues: GitHubIssue[] | null;
  issuesError: string | null;
  rateLimit: RateLimitInfo | null;
  notices: string[];
}

export function findContributingGuide(tree: TreeEntry[]): string | null {
  const hit = tree.find((e) => e.type === "blob" && /^(\.github\/|docs\/)?contributing(\.md|\.rst|\.txt)?$/i.test(e.path));
  return hit?.path ?? null;
}

export function testCommandFor(manifests: Record<string, string | null>, tree: TreeEntry[]): string | null {
  const pkg = safeJson<PackageJson>(manifests["package.json"]);
  if (pkg?.scripts?.test && !/no test specified/.test(pkg.scripts.test)) {
    const pm = tree.some((e) => e.path === "pnpm-lock.yaml") ? "pnpm" : tree.some((e) => e.path === "yarn.lock") ? "yarn" : "npm";
    return pm === "npm" ? "npm test" : `${pm} test`;
  }
  if (manifests["Cargo.toml"]) return "cargo test";
  if (manifests["go.mod"]) return "go test ./...";
  if (manifests["pyproject.toml"] || manifests["requirements.txt"]) {
    if (tree.some((e) => /(^|\/)(tests?|.*_test\.py|test_.*\.py)/.test(e.path))) return "pytest";
  }
  return null;
}

/** Pure function: turn fetched data into the full analysis. No network access. */
export function assembleAnalysis(raw: RawRepoData, now = new Date()): RepoAnalysis {
  const entryPoints = detectEntryPoints(raw.tree, {
    packageJson: raw.manifests["package.json"],
    pyproject: raw.manifests["pyproject.toml"],
    cargoToml: raw.manifests["Cargo.toml"],
    goMod: raw.manifests["go.mod"],
  });

  const goModule = raw.manifests["go.mod"]?.match(/^module\s+(\S+)/m)?.[1] ?? null;
  const graph = buildArchitecture({
    tree: raw.tree,
    files: raw.sourceFiles,
    entryPoints,
    tsconfig: raw.manifests["tsconfig.json"],
    goModule,
  });

  const languages = computeLanguages(raw.githubLanguages, raw.tree);
  const totalSourceFiles = raw.tree.filter((e) => e.type === "blob" && !isIgnoredPath(e.path) && isSourceFile(e.path)).length;
  const summary = buildSummary({
    meta: raw.meta,
    tree: raw.tree,
    readme: raw.readme,
    languages,
    entryPoints,
    graph,
    manifests: raw.manifests,
    analyzedSourceFiles: raw.sourceFiles.length,
    totalSourceFiles,
    treeTruncated: raw.treeTruncated,
  });

  const contributingPath = findContributingGuide(raw.tree);
  const issues = raw.issues
    ? rankIssues(raw.issues, raw.tree, {
        contributingPath,
        testCommand: testCommandFor(raw.manifests, raw.tree),
        primaryLanguage: raw.meta.primaryLanguage,
      })
    : [];

  return {
    meta: raw.meta,
    ref: raw.ref,
    generatedAt: now.toISOString(),
    tree: raw.tree,
    treeTruncated: raw.treeTruncated,
    totalFiles: raw.tree.filter((e) => e.type === "blob").length,
    readme: raw.readme,
    languages,
    entryPoints,
    graph,
    summary,
    issues,
    issuesError: raw.issuesError,
    contributingPath,
    rateLimit: raw.rateLimit,
    notices: raw.notices,
  };
}
