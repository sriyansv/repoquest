/**
 * Generates src/data/demo.json: RepoQuest's analysis of its OWN source code,
 * produced by the same pipeline used for GitHub repositories. The landing page
 * renders it as a live, honest demo (no mock data).
 *
 *   npm run demo:build
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { assembleAnalysis, MANIFEST_FILES, workspaceManifestPaths } from "../src/lib/analysis/assemble";
import { detectEntryPoints, selectFilesToAnalyze } from "../src/lib/analysis/structure";
import type { TreeEntry } from "../src/lib/types";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !f.startsWith("src/data/"));

const dirs = new Set<string>();
for (const f of files) {
  const parts = f.split("/");
  for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
}
const tree: TreeEntry[] = [
  ...[...dirs].sort().map((path) => ({ path, type: "tree" as const })),
  ...files.sort().map((path) => ({ path, type: "blob" as const, size: statSync(path).size })),
];

const read = (p: string) => readFileSync(p, "utf8");
const manifests: Record<string, string | null> = {};
for (const m of MANIFEST_FILES) if (files.includes(m)) manifests[m] = read(m);
const pkg = JSON.parse(read("package.json"));

const entryPoints = detectEntryPoints(tree, { packageJson: manifests["package.json"] });
const sourceFiles = selectFilesToAnalyze(tree, entryPoints, 200).map((path) => {
  const content = read(path);
  return { path, content, size: content.length };
});

const analysis = assembleAnalysis({
  meta: {
    owner: "sriyansv", repo: "repoquest", fullName: "sriyansv/repoquest",
    description: pkg.description, homepage: null, defaultBranch: "main",
    stars: 0, forks: 0, openIssues: 0, license: "MIT", topics: [],
    primaryLanguage: "TypeScript", ownerAvatar: null, htmlUrl: "https://github.com/sriyansv/repoquest",
    pushedAt: null, archived: false, fork: false, sizeKb: 0,
  },
  ref: "main",
  tree,
  treeTruncated: false,
  readme: files.includes("README.md") ? { path: "README.md", content: read("README.md") } : null,
  githubLanguages: null,
  manifests,
  sourceFiles,
  workspaceManifests: workspaceManifestPaths(tree).map((path) => ({ path, content: read(path) })),
  issues: [],
  issuesError: null,
  rateLimit: null,
  notices: [],
});

mkdirSync("src/data", { recursive: true });
const { graph, summary, entryPoints: eps, languages, totalFiles } = analysis;
writeFileSync(
  "src/data/demo.json",
  JSON.stringify({ graph: { ...graph, fileDependencies: graph.fileDependencies.slice(0, 400) }, summary, entryPoints: eps, languages, totalFiles }, null, 1) + "\n",
);
console.log(`demo.json: ${graph.nodes.length} modules, ${graph.edges.length} edges, ${graph.fileDependencies.length} file deps from ${sourceFiles.length} files`);
