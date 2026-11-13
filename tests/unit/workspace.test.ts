import { describe, expect, it } from "vitest";
import { workspaceManifestPaths } from "@/lib/analysis/assemble";
import { buildArchitecture } from "@/lib/analysis/graph";
import { extractImports, resolveImport, workspacePackages } from "@/lib/analysis/imports";
import type { TreeEntry } from "@/lib/types";

const blobs = (paths: string[]): TreeEntry[] => paths.map((path) => ({ path, type: "blob", size: 10 }));

describe("JS workspace packages", () => {
  const paths = [
    "package.json",
    "packages/core/package.json", "packages/core/src/index.ts", "packages/core/src/math.ts",
    "packages/ui/package.json", "packages/ui/index.tsx",
    "apps/web/package.json", "apps/web/src/main.ts",
  ];
  const files = new Set(paths);
  const ws = workspacePackages(
    [
      { path: "packages/core/package.json", content: JSON.stringify({ name: "@acme/core", main: "dist/index.js" }) },
      { path: "packages/ui/package.json", content: JSON.stringify({ name: "acme-ui", exports: { ".": { import: "./index.tsx" } } }) },
      { path: "apps/web/package.json", content: JSON.stringify({ name: "web" }) },
      { path: "package.json", content: JSON.stringify({ name: "root" }) },
    ],
    files,
  );
  const ctx = { files, aliases: {}, workspace: ws };
  const resolve = (spec: string) => resolveImport("apps/web/src/main.ts", { specifier: spec, kind: "package" }, ctx);

  it("ignores the root manifest", () => expect(ws.has("root")).toBe(false));
  it("falls back to src/index when main points at an unbuilt dist/", () => expect(resolve("@acme/core")).toBe("packages/core/src/index.ts"));
  it("uses exports['.'] entry", () => expect(resolve("acme-ui")).toBe("packages/ui/index.tsx"));
  it("resolves subpaths inside src/", () => expect(resolve("@acme/core/math")).toBe("packages/core/src/math.ts"));
  it("never resolves unknown packages", () => {
    expect(resolve("react")).toBeNull();
    expect(resolve("@acme/missing")).toBeNull();
  });
  it("produces confirmed module edges between workspace packages", () => {
    const g = buildArchitecture({
      tree: blobs(paths),
      files: [{ path: "apps/web/src/main.ts", size: 50, content: 'import { add } from "@acme/core";\nimport { Button } from "acme-ui";\nimport React from "react";\n' }],
      entryPoints: [],
      workspaceManifests: [
        { path: "packages/core/package.json", content: JSON.stringify({ name: "@acme/core" }) },
        { path: "packages/ui/package.json", content: JSON.stringify({ name: "acme-ui", main: "index.tsx" }) },
      ],
    });
    const ids = g.edges.filter((e) => e.kind === "confirmed").map((e) => e.id).sort();
    expect(ids).toEqual(["apps/web→packages/core", "apps/web→packages/ui"]);
    expect(g.externalPackages.map((p) => p.name)).toEqual(["react"]);
  });
});

describe("Rust workspace crates", () => {
  const paths = ["Cargo.toml", "crates/core/Cargo.toml", "crates/core/main.rs", "crates/searcher/Cargo.toml", "crates/searcher/src/lib.rs", "crates/cli/Cargo.toml", "crates/cli/src/lib.rs"];
  const files = new Set(paths);
  const ws = workspacePackages(
    [
      { path: "crates/searcher/Cargo.toml", content: '[package]\nname = "grep-searcher"\nversion = "0.1.0"\n\n[dependencies]\nserde = "1"\n' },
      { path: "crates/cli/Cargo.toml", content: '[package]\nname = "grep-cli"\n' },
    ],
    files,
  );
  const code = "use grep_searcher::Searcher;\nuse std::io;\nuse serde::Serialize;\npub use grep_cli as cli;\nextern crate grep_cli;\nuse crate::flags;\n";

  it("extracts external crate uses but skips std/crate/self", () => {
    const specs = extractImports("crates/core/main.rs", code).map((i) => i.specifier);
    expect(specs).toContain("rsuse:grep_searcher");
    expect(specs).toContain("rsuse:serde");
    expect(specs).toContain("rsuse:grep_cli");
    expect(specs.some((s) => s === "rsuse:std" || s === "rsuse:crate")).toBe(false);
  });
  it("maps hyphenated crate names to their lib.rs, and leaves third-party crates unresolved", () => {
    const ctx = { files, aliases: {}, workspace: ws };
    const r = (s: string) => resolveImport("crates/core/main.rs", { specifier: s, kind: "package" }, ctx);
    expect(r("rsuse:grep_searcher")).toBe("crates/searcher/src/lib.rs");
    expect(r("rsuse:grep_cli")).toBe("crates/cli/src/lib.rs");
    expect(r("rsuse:serde")).toBeNull();
  });
});

describe("workspaceManifestPaths", () => {
  it("picks nested manifests, skips root, node_modules, examples and deep paths", () => {
    const got = workspaceManifestPaths(blobs([
      "package.json", "packages/a/package.json", "crates/b/Cargo.toml", "node_modules/x/package.json",
      "examples/demo/package.json", "a/b/c/d/package.json",
    ]));
    expect(got).toEqual(["crates/b/Cargo.toml", "packages/a/package.json"]);
  });
});
