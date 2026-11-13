import { describe, it, expect } from "vitest";
import { assembleAnalysis, findContributingGuide, testCommandFor } from "@/lib/analysis/assemble";
import { miniRaw, tree } from "./fixtures";

describe("assembleAnalysis (mini TS project)", () => {
  const a = assembleAnalysis(miniRaw, new Date("2026-06-01T00:00:00Z"));

  it("fills basic fields", () => {
    expect(a.generatedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(a.totalFiles).toBe(miniRaw.tree.length);
    expect(a.ref).toBe("main");
    expect(a.languages[0].language).toBe("TypeScript");
  });
  it("detects entry point from package.json main", () => {
    expect(a.entryPoints[0]).toMatchObject({ path: "src/index.ts", evidence: "confirmed" });
  });
  it("resolves file dependencies including @/ alias from tsconfig with comments", () => {
    const pairs = a.graph.fileDependencies.map((d) => `${d.from}->${d.to}`);
    expect(pairs).toContain("src/index.ts->src/lib/a.ts");
    expect(pairs).toContain("tests/a.test.ts->src/lib/a.ts");
  });
  it("builds confirmed module edges and external packages", () => {
    expect(a.graph.edges).toContainEqual(expect.objectContaining({ source: "tests", target: "src/lib", kind: "confirmed" }));
    expect(a.graph.edges).toContainEqual(expect.objectContaining({ source: "src", target: "src/lib", kind: "confirmed" }));
    expect(a.graph.externalPackages.map((p) => p.name)).toEqual(expect.arrayContaining(["react", "vitest"]));
  });
  it("summary mentions React and has flow starting at entry", () => {
    expect(a.summary.techStack.map((f) => f.text).join(" ")).toContain("React");
    expect(a.summary.executionFlow[0].file).toBe("src/index.ts");
    expect(a.summary.executionFlow[0].calls).toContain("src/lib/a.ts");
  });
  it("ranks issues: PR dropped, short-body not good-first", () => {
    expect(a.issues.map((i) => i.number).sort()).toEqual([1, 2]);
    expect(a.issues.find((i) => i.number === 1)!.verdict).toBe("good-first");
    expect(a.issues.find((i) => i.number === 2)!.verdict).not.toBe("good-first");
    expect(a.issues[0].number).toBe(1);
  });
  it("includes test command in issue prerequisites", () => {
    expect(a.issues[0].prerequisites.join("\n")).toContain("`npm test`");
  });
  it("handles null issues", () => {
    expect(assembleAnalysis({ ...miniRaw, issues: null, issuesError: "rate limited" }).issues).toEqual([]);
  });
});

describe("helpers", () => {
  it("findContributingGuide", () => {
    expect(findContributingGuide(tree(["README.md", ".github/CONTRIBUTING.md"]))).toBe(".github/CONTRIBUTING.md");
    expect(findContributingGuide(tree(["README.md"]))).toBeNull();
  });
  it("testCommandFor", () => {
    expect(testCommandFor({ "package.json": '{"scripts":{"test":"jest"}}' }, tree(["pnpm-lock.yaml"]))).toBe("pnpm test");
    expect(testCommandFor({ "package.json": '{"scripts":{"test":"echo \\"Error: no test specified\\" && exit 1"}}' }, [])).toBeNull();
    expect(testCommandFor({ "Cargo.toml": "x" }, [])).toBe("cargo test");
    expect(testCommandFor({ "go.mod": "x" }, [])).toBe("go test ./...");
  });
});
