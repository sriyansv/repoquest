import type { RepoMeta, TreeEntry, SourceFile } from "@/lib/types";
import type { RawRepoData } from "@/lib/analysis/assemble";
import type { GitHubIssue } from "@/lib/analysis/issues";

export const blob = (path: string, size = 100): TreeEntry => ({ path, type: "blob", size });
export const tree = (paths: string[]): TreeEntry[] => paths.map((p) => blob(p));

export const meta: RepoMeta = {
  owner: "acme", repo: "mini", fullName: "acme/mini", description: "A tiny demo project for tests",
  homepage: null, defaultBranch: "main", stars: 1, forks: 0, openIssues: 2, license: "MIT",
  topics: ["demo"], primaryLanguage: "TypeScript", ownerAvatar: null, htmlUrl: "https://github.com/acme/mini",
  pushedAt: "2026-01-01T00:00:00Z", archived: false, fork: false, sizeKb: 10,
};

export const NOW = new Date("2026-06-01T00:00:00Z").getTime();

export const longBody =
  "The login button does not show an error when the password is wrong. Steps to reproduce: open the page, type a bad password, press submit. Expected behavior: a red message appears below the field. See src/lib/a.ts for the helper used.";

export function issue(over: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 1, title: "Show error on bad password", html_url: "https://github.com/acme/mini/issues/1",
    body: longBody, labels: [], user: { login: "bob" }, comments: 0,
    created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-20T00:00:00Z",
    assignee: null, assignees: [], state: "open", ...over,
  };
}

export const miniFiles: SourceFile[] = [
  { path: "src/index.ts", size: 60, content: `import { a } from "./lib/a";\nimport React from "react";\nconsole.log(a);\n` },
  { path: "src/lib/a.ts", size: 40, content: `export const a = 1;\n` },
  { path: "tests/a.test.ts", size: 60, content: `import { a } from "@/lib/a";\nimport { describe } from "vitest";\n` },
];

export const miniTree: TreeEntry[] = [
  blob("package.json"), blob("tsconfig.json"), blob("README.md"), blob("package-lock.json"),
  ...miniFiles.map((f) => blob(f.path, f.size)),
];

export const miniRaw: RawRepoData = {
  meta, ref: "main", tree: miniTree, treeTruncated: false,
  readme: { path: "README.md", content: "# Mini\n\nMini is a small demo project used to exercise the analysis pipeline end to end.\n\n## Install\n\nnpm install\n" },
  githubLanguages: { TypeScript: 1000 },
  manifests: {
    "package.json": JSON.stringify({ name: "mini", main: "src/index.ts", scripts: { test: "vitest run", dev: "node src/index.ts" }, dependencies: { react: "^19" }, devDependencies: { vitest: "^5" } }),
    "tsconfig.json": `{\n // comment\n "compilerOptions": { "paths": { "@/*": ["./src/*"], }, },\n}`,
    "pyproject.toml": null, "requirements.txt": null, "Cargo.toml": null, "go.mod": null, Makefile: null,
  },
  sourceFiles: miniFiles,
  issues: [
    issue({ number: 1, labels: ["good first issue"] }),
    issue({ number: 2, title: "Typo", body: "x", labels: ["good first issue"] }),
    issue({ number: 3, title: "PR", pull_request: {}, labels: ["good first issue"] }),
  ],
  issuesError: null, rateLimit: null, notices: [],
};
