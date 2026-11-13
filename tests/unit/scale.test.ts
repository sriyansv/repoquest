import { describe, expect, it } from "vitest";
import { assembleAnalysis } from "@/lib/analysis/assemble";
import { selectFilesToAnalyze } from "@/lib/analysis/structure";
import { buildTree, searchPaths } from "@/lib/filetree";
import type { SourceFile, TreeEntry } from "@/lib/types";
import { miniRaw } from "./fixtures";

/** A synthetic monorepo-sized tree: 60 packages × 250 files = 15,000 files. */
function bigTree(): TreeEntry[] {
  const out: TreeEntry[] = [{ path: "package.json", type: "blob", size: 500 }];
  for (let p = 0; p < 60; p++) {
    for (let f = 0; f < 250; f++) out.push({ path: `packages/pkg${p}/src/dir${f % 10}/file${f}.ts`, type: "blob", size: 2000 });
  }
  return out;
}

describe("large repositories", () => {
  it("selects a bounded, well-spread sample of files", () => {
    const tree = bigTree();
    const picked = selectFilesToAnalyze(tree, [], 80);
    expect(picked).toHaveLength(80);
    expect(new Set(picked.map((p) => p.split("/").slice(0, 2).join("/"))).size).toBe(60);
  });

  it("analyzes a 15,000-file tree quickly and caps the graph size", () => {
    const tree = bigTree();
    const files: SourceFile[] = selectFilesToAnalyze(tree, [], 80).map((path, i) => ({
      path,
      size: 50,
      content: `import { x } from "../../../pkg${(i + 1) % 60}/src/dir0/file0";\n`,
    }));
    const t0 = performance.now();
    const a = assembleAnalysis({ ...miniRaw, tree, sourceFiles: files, manifests: {}, readme: null, issues: [] });
    const ms = performance.now() - t0;
    expect(a.totalFiles).toBe(15_001);
    expect(a.graph.nodes.length).toBeLessThanOrEqual(36);
    expect(a.graph.edges.some((e) => e.kind === "confirmed")).toBe(true);
    expect(ms).toBeLessThan(3000);
  });

  it("builds the browser file tree and searches it quickly", () => {
    const tree = bigTree();
    const t0 = performance.now();
    const root = buildTree(tree);
    const hits = searchPaths(tree, "pkg7 file12");
    expect(performance.now() - t0).toBeLessThan(1500);
    expect(root.fileCount).toBe(15_001);
    expect(hits.every((h) => h.includes("pkg7") && h.includes("file12"))).toBe(true);
  });
});
