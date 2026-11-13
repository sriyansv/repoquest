import { describe, it, expect } from "vitest";
import { buildArchitecture, traceExecutionFlow, layoutGraph } from "@/lib/analysis/graph";
import { tree } from "./fixtures";

const sf = (path: string, content: string) => ({ path, content, size: content.length });

describe("buildArchitecture", () => {
  const t = tree(["src/index.ts", "src/lib/a.ts", "src/lib/b.ts", "src/ui/c.ts", "tests/a.test.ts", "examples/demo.ts", "docs/readme.md", "src/lib/self.ts"]);
  const files = [
    sf("src/index.ts", `import {a} from "./lib/a"; import {b} from "./lib/b"; import "./ui/c";`),
    sf("src/lib/a.ts", `import {b} from "./b"; import x from "react";`),
    sf("src/ui/c.ts", `import {a} from "../lib/a";`),
    sf("tests/a.test.ts", `import {x} from "vitest";`),
    sf("examples/demo.ts", `import {x} from "../src/index";`),
  ];
  const g = buildArchitecture({ tree: t, files, entryPoints: [{ path: "src/index.ts", reason: "", evidence: "convention" }] });

  it("aggregates confirmed edges with weight and evidence", () => {
    const e = g.edges.find((x) => x.source === "src" && x.target === "src/lib")!;
    expect(e.kind).toBe("confirmed");
    expect(e.weight).toBe(2);
    expect(e.evidence).toHaveLength(2);
    expect(e.evidence[0]).toContain("src/index.ts imports src/lib/a.ts");
  });
  it("has no self loops", () => {
    expect(g.edges.every((e) => e.source !== e.target)).toBe(true);
    expect(g.edges.find((e) => e.source === "src/lib" && e.target === "src/lib")).toBeUndefined();
  });
  it("tracks external packages", () => {
    expect(g.externalPackages).toContainEqual({ name: "react", importedBy: 1 });
  });
  it("infers edge only for Tests with no confirmed outgoing edges, labelled inferred", () => {
    const inferred = g.edges.filter((e) => e.kind === "inferred");
    expect(inferred.map((e) => e.source)).toContain("tests");
    expect(inferred.every((e) => e.weight === 0)).toBe(true);
    // examples has a confirmed outgoing edge so must not get an inferred one
    expect(inferred.map((e) => e.source)).not.toContain("examples");
    expect(g.edges.find((e) => e.source === "docs")).toBeUndefined();
  });
  it("marks entry module", () => {
    expect(g.nodes.find((n) => n.id === "src")!.isEntry).toBe(true);
    expect(g.nodes.find((n) => n.id === "src/lib")!.isEntry).toBe(false);
  });
});

describe("traceExecutionFlow", () => {
  it("follows imports from entry points and ignores link relations", () => {
    const deps = [
      { from: "index.html", to: "app.js", specifier: "app.js", relation: "script" as const },
      { from: "index.html", to: "about.html", specifier: "about.html", relation: "link" as const },
      { from: "app.js", to: "util.js", specifier: "./util", relation: "import" as const },
    ];
    const steps = traceExecutionFlow([{ path: "index.html", reason: "", evidence: "convention" }], deps);
    expect(steps[0]).toEqual({ depth: 0, file: "index.html", calls: ["app.js"] });
    expect(steps[1]).toMatchObject({ depth: 1, file: "app.js", calls: ["util.js"] });
    expect(JSON.stringify(steps)).not.toContain("about.html");
  });
  it("handles cycles without looping forever", () => {
    const deps = [
      { from: "a", to: "b", specifier: "", relation: "import" as const },
      { from: "b", to: "a", specifier: "", relation: "import" as const },
    ];
    const steps = traceExecutionFlow([{ path: "a", reason: "", evidence: "convention" }], deps);
    expect(steps.length).toBeLessThanOrEqual(2);
  });
  it("returns nothing when entry has no deps", () => {
    expect(traceExecutionFlow([{ path: "a", reason: "", evidence: "convention" }], [])).toEqual([]);
  });
});

describe("layoutGraph", () => {
  const nodes = ["a", "b", "c", "d", "iso"].map((id) => ({ id }));
  const edges = [{ source: "a", target: "b" }, { source: "b", target: "c" }, { source: "c", target: "a" }, { source: "a", target: "d" }, { source: "d", target: "d" }];
  it("one position per node", () => {
    const p = layoutGraph(nodes, edges);
    expect(p.map((x) => x.id).sort()).toEqual(["a", "b", "c", "d", "iso"]);
  });
  it("is deterministic", () => {
    expect(layoutGraph(nodes, edges)).toEqual(layoutGraph(nodes, edges));
  });
  it("has no overlapping positions", () => {
    const wide = Array.from({ length: 20 }, (_, i) => ({ id: `n${i}` }));
    const e = wide.slice(1).map((n) => ({ source: "n0", target: n.id }));
    const p = layoutGraph(wide, e);
    expect(new Set(p.map((x) => `${x.x},${x.y}`)).size).toBe(20);
  });
  it("ranks sources above targets and survives cycles", () => {
    const p = Object.fromEntries(layoutGraph(nodes, edges).map((x) => [x.id, x]));
    expect(p.a.y).toBeLessThan(p.b.y);
    expect(p.b.y).toBeLessThan(p.c.y);
    expect(p.iso.y).toBeGreaterThan(p.a.y);
  });
  it("handles empty input", () => {
    expect(layoutGraph([], [])).toEqual([]);
  });
});
