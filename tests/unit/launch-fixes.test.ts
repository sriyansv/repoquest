import { describe, expect, it } from "vitest";
import { assessIssue } from "@/lib/analysis/issues";
import { detectEntryPoints, selectFilesToAnalyze, sourceForBuiltPath } from "@/lib/analysis/structure";
import type { TreeEntry } from "@/lib/types";
import { issue, longBody } from "./fixtures";

const t = (entries: [string, number][]): TreeEntry[] => entries.map(([path, size]) => ({ path, type: "blob", size }));

describe("file sampling (found on fastapi/fastapi)", () => {
  it("skips empty files such as __init__.py package markers", () => {
    const tree = t([["docs_src/a/__init__.py", 0], ["docs_src/a/tutorial001.py", 300], ["docs_src/b/__init__.py", 0], ["docs_src/b/tutorial001.py", 300]]);
    const picked = selectFilesToAnalyze(tree, [], 10);
    expect(picked.sort()).toEqual(["docs_src/a/tutorial001.py", "docs_src/b/tutorial001.py"]);
  });
});

describe("entry points (found on sindresorhus/got and excalidraw/excalidraw)", () => {
  it("maps uncommitted build output in package.json to the committed source", () => {
    const tree = t([["package.json", 10], ["source/index.ts", 100], ["source/core/x.ts", 100]]);
    const eps = detectEntryPoints(tree, { packageJson: JSON.stringify({ exports: "./distribution/source/index.js", main: "dist/index.js" }) });
    expect(eps[0].path).toBe("source/index.ts");
    expect(eps[0].evidence).toBe("convention");
    expect(eps[0].reason).toMatch(/build output/);
  });
  it("uses a committed exports['.'] file directly as a confirmed entry", () => {
    const tree = t([["package.json", 10], ["src/main.js", 100]]);
    const eps = detectEntryPoints(tree, { packageJson: JSON.stringify({ exports: { ".": { import: "./src/main.js" } } }) });
    expect(eps[0]).toMatchObject({ path: "src/main.js", evidence: "confirmed" });
  });
  it("ranks a Dockerfile after code entry points", () => {
    const tree = t([["Dockerfile", 10], ["app/src/index.tsx", 100], ["src/index.ts", 100]]);
    const eps = detectEntryPoints(tree, {});
    expect(eps.at(-1)?.path).toBe("Dockerfile");
    expect(eps[0].path).toBe("src/index.ts");
  });
  it("sourceForBuiltPath returns null when no source exists", () => {
    expect(sourceForBuiltPath("dist/index.js", new Set(["README.md"]))).toBeNull();
    expect(sourceForBuiltPath("dist/index.js", new Set(["src/index.ts"]))).toBe("src/index.ts");
  });
});

describe("issue age (found on excalidraw/excalidraw)", () => {
  const ctx = { contributingPath: null, testCommand: null, primaryLanguage: "TypeScript" };
  const now = new Date("2026-11-13T00:00:00Z").getTime();
  it("flags issues that have been open for years even if recently updated", () => {
    const a = assessIssue(issue({ labels: [{ name: "good first issue" }], body: longBody, created_at: "2022-01-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z" }), [], ctx, now);
    expect(a.reasons.some((r) => !r.positive && /Open for 4\+ years/.test(r.text))).toBe(true);
  });
  it("does not flag recent issues", () => {
    const a = assessIssue(issue({ labels: [{ name: "good first issue" }], body: longBody, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z" }), [], ctx, now);
    expect(a.reasons.some((r) => /Open for/.test(r.text))).toBe(false);
    expect(a.verdict).toBe("good-first");
  });
});
