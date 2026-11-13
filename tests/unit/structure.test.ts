import { describe, it, expect } from "vitest";
import { moduleOf, roleOfModule, detectEntryPoints, selectFilesToAnalyze } from "@/lib/analysis/structure";
import { tree, blob } from "./fixtures";

describe("moduleOf / roleOfModule", () => {
  it("maps paths to modules", () => {
    expect(moduleOf("README.md")).toBe("(root)");
    expect(moduleOf("src/lib/x/y.ts")).toBe("src/lib/x");
    expect(moduleOf("src/lib/y.ts")).toBe("src/lib");
    expect(moduleOf("src/components/forms/Input.tsx")).toBe("src/components/forms");
    expect(moduleOf("src/index.ts")).toBe("src");
    expect(moduleOf("packages/foo/src/a.ts")).toBe("packages/foo");
    expect(moduleOf("docs/a.md")).toBe("docs");
    expect(moduleOf("cmd/tool/main.go")).toBe("cmd/tool");
  });
  it("assigns roles", () => {
    expect(roleOfModule("(root)")).toBe("Top-level files");
    expect(roleOfModule("tests")).toBe("Tests");
    expect(roleOfModule("src/lib")).toBe("Shared library code");
    expect(roleOfModule("src/components")).toBe("UI components");
    expect(roleOfModule("docs")).toBe("Documentation");
    expect(roleOfModule("weird")).toBeNull();
  });
});

describe("detectEntryPoints", () => {
  it("reads package.json main, bin and start script", () => {
    const t = tree(["package.json", "lib/main.js", "bin/cli.js", "server.js", "other.js"]);
    const eps = detectEntryPoints(t, {
      packageJson: JSON.stringify({ main: "./lib/main.js", bin: { tool: "bin/cli.js" }, scripts: { start: "node server.js" } }),
    });
    const byPath = Object.fromEntries(eps.map((e) => [e.path, e]));
    expect(byPath["lib/main.js"].evidence).toBe("confirmed");
    expect(byPath["bin/cli.js"].reason).toContain("tool");
    expect(byPath["server.js"].reason).toContain("npm run start");
    expect(byPath["other.js"]).toBeUndefined();
  });
  it("reads pyproject scripts", () => {
    const t = tree(["pyproject.toml", "src/mypkg/cli.py"]);
    const eps = detectEntryPoints(t, { pyproject: `[project]\nname="x"\n[project.scripts]\nmycli = "mypkg.cli:main"\n[tool.x]\n` });
    expect(eps).toEqual([expect.objectContaining({ path: "src/mypkg/cli.py", evidence: "confirmed" })]);
  });
  it("detects conventions", () => {
    const t = tree(["src/main.rs", "cmd/x/main.go", "index.html", "README.md"]);
    const paths = detectEntryPoints(t, {}).map((e) => e.path);
    expect(paths).toEqual(expect.arrayContaining(["src/main.rs", "cmd/x/main.go", "index.html"]));
    expect(paths).not.toContain("README.md");
    expect(detectEntryPoints(t, {}).every((e) => e.evidence === "convention")).toBe(true);
  });
  it("sorts confirmed before convention", () => {
    const t = tree(["index.html", "deep/er/entry.js"]);
    const eps = detectEntryPoints(t, { packageJson: JSON.stringify({ main: "deep/er/entry.js" }) });
    expect(eps[0]).toMatchObject({ path: "deep/er/entry.js", evidence: "confirmed" });
    expect(eps[1].path).toBe("index.html");
  });
  it("never returns files not in the tree", () => {
    const eps = detectEntryPoints(tree(["a.js"]), { packageJson: JSON.stringify({ main: "missing.js", bin: "nope.js", scripts: { start: "node ghost.js" } }) });
    expect(eps).toEqual([]);
  });
  it("tolerates malformed package.json", () => {
    expect(detectEntryPoints(tree(["index.js"]), { packageJson: "{bad" }).map((e) => e.path)).toEqual(["index.js"]);
  });
});

describe("selectFilesToAnalyze", () => {
  it("skips node_modules, binaries, minified, d.ts, oversized, non-source", () => {
    const t = [
      blob("src/a.ts"), blob("node_modules/x/i.js"), blob("src/logo.png"), blob("src/app.min.js"),
      blob("src/types.d.ts"), blob("src/huge.ts", 500_000), blob("README.md"), blob("dist/o.js"),
    ];
    expect(selectFilesToAnalyze(t, [])).toEqual(["src/a.ts"]);
  });
  it("respects budget", () => {
    const t = Array.from({ length: 50 }, (_, i) => blob(`src/f${i}.ts`));
    expect(selectFilesToAnalyze(t, [], 10)).toHaveLength(10);
  });
  it("includes entry points first", () => {
    const t = [blob("a/x.ts"), blob("b/y.ts"), blob("deep/er/est/entry.ts")];
    const out = selectFilesToAnalyze(t, [{ path: "deep/er/est/entry.ts", reason: "r", evidence: "confirmed" }], 2);
    expect(out[0]).toBe("deep/er/est/entry.ts");
    expect(out).toHaveLength(2);
  });
  it("round-robins across modules", () => {
    const t = [
      ...Array.from({ length: 20 }, (_, i) => blob(`aaa/f${i}.ts`)),
      blob("zzz/only.ts"), blob("mmm/only.ts"),
    ];
    const out = selectFilesToAnalyze(t, [], 3);
    expect(new Set(out.map((p) => p.split("/")[0]))).toEqual(new Set(["aaa", "mmm", "zzz"]));
  });
  it("does not duplicate entry points", () => {
    const t = [blob("src/main.ts"), blob("src/b.ts")];
    const out = selectFilesToAnalyze(t, [{ path: "src/main.ts", reason: "", evidence: "convention" }], 10);
    expect(out.sort()).toEqual(["src/b.ts", "src/main.ts"]);
  });
});

describe("moduleOf inside workspace folders", () => {
  it("keeps the package name as the module, even when it matches a nested-group name", () => {
    expect(moduleOf("packages/core/src/index.ts")).toBe("packages/core");
    expect(moduleOf("crates/core/src/main.rs")).toBe("crates/core");
    expect(moduleOf("apps/api/src/server.ts")).toBe("apps/api");
    expect(moduleOf("src/core/engine/x.ts")).toBe("src/core/engine"); // nested groups still split outside workspaces
  });
});
