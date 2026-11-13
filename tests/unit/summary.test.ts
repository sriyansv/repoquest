import { describe, it, expect } from "vitest";
import { readmeIntro, readmeSetupHeadings, buildSummary, type SummaryInput } from "@/lib/analysis/summary";
import { buildArchitecture } from "@/lib/analysis/graph";
import { meta, tree } from "./fixtures";

describe("readmeIntro", () => {
  it("skips badges, headings, html, code blocks", () => {
    const md = `# Title

[![Build](https://img.shields.io/x.svg)](https://ci) ![logo](a.png)

<p align="center"><img src="x.png"></p>

\`\`\`bash
npm install this-is-code and some more words here to be long enough
\`\`\`

**Widget** is a fast library for turning widgets into [gadgets](https://x.com) in the browser.

Second paragraph that should not be returned at all, even though it is long.
`;
    expect(readmeIntro(md)).toBe("Widget is a fast library for turning widgets into gadgets in the browser.");
  });
  it("returns null when no prose", () => {
    expect(readmeIntro("# Hi\n\n![b](x)\n\n- a\n- b\n")).toBeNull();
  });
  it("truncates very long paragraphs", () => {
    const p = ("word ".repeat(300)).trim();
    const r = readmeIntro(p)!;
    expect(r.length).toBeLessThanOrEqual(601);
    expect(r.endsWith("…")).toBe(true);
  });
});

describe("readmeSetupHeadings", () => {
  it("finds setup-like headings, dedupes", () => {
    const md = "# Proj\n## Installation\n### Usage\n## License\n## Installation\n## **Getting Started**\n";
    expect(readmeSetupHeadings(md)).toEqual(["Installation", "Usage", "Getting Started"]);
  });
});

function input(over: Partial<SummaryInput> & { paths?: string[] } = {}): SummaryInput {
  const t = tree(over.paths ?? ["package.json", "src/index.ts"]);
  return {
    meta: { ...meta, description: null, topics: [] }, tree: t, readme: null, languages: [], entryPoints: [],
    graph: buildArchitecture({ tree: t, files: [], entryPoints: [] }), manifests: {}, analyzedSourceFiles: 0, totalSourceFiles: 0, treeTruncated: false,
    ...over,
  };
}

describe("buildSummary", () => {
  const pkg = JSON.stringify({ description: "pkg desc", scripts: { dev: "next dev", test: "vitest" }, dependencies: { next: "15", react: "19" } });

  it("detects Next.js and React", () => {
    const s = buildSummary(input({ manifests: { "package.json": pkg } }));
    const stack = s.techStack.map((f) => f.text).join(" ");
    expect(stack).toContain("Next.js");
    expect(stack).toContain("React");
  });
  it("attaches a non-empty source to every fact", () => {
    const s = buildSummary(input({
      manifests: { "package.json": pkg, Makefile: "build:\n\techo\n", "go.mod": "module x/y\ngo 1.22\n" },
      readme: { path: "README.md", content: "# A\n\n## Install\n\nThis project does a number of interesting things for people.\n" },
      languages: [{ language: "TypeScript", bytes: 10, percent: 100, color: "#3178c6" }],
      paths: ["package.json", "Dockerfile", ".github/workflows/ci.yml", "src/a.ts"],
      meta: { ...meta, description: "desc" },
    }));
    const facts = [...s.whatItDoes, ...s.techStack, ...s.howToRun, ...s.structure];
    expect(facts.length).toBeGreaterThan(6);
    for (const f of facts) expect(f.source).toBeTruthy();
  });
  it("uses pnpm from pnpm-lock.yaml", () => {
    const s = buildSummary(input({ manifests: { "package.json": pkg }, paths: ["package.json", "pnpm-lock.yaml"] }));
    const run = s.howToRun.map((f) => f.text).join("\n");
    expect(run).toContain("pnpm install");
    expect(run).not.toMatch(/(^|[^p])npm install/);
    expect(run).toContain("`pnpm dev`");
  });
  it("uses yarn and defaults to npm", () => {
    expect(buildSummary(input({ manifests: { "package.json": pkg }, paths: ["yarn.lock", "package.json"] })).howToRun[0].text).toContain("yarn install");
    const n = buildSummary(input({ manifests: { "package.json": pkg } })).howToRun.map((f) => f.text).join("\n");
    expect(n).toContain("npm install");
    expect(n).toContain("npm run dev");
  });
  it("static site message when only index.html", () => {
    const s = buildSummary(input({ paths: ["index.html", "style.css"] }));
    expect(s.howToRun).toHaveLength(1);
    expect(s.howToRun[0].text).toMatch(/static site/);
  });
  it("adds caveats", () => {
    const s = buildSummary(input({ totalSourceFiles: 10, analyzedSourceFiles: 4, treeTruncated: true }));
    expect(s.caveats.join(" ")).toMatch(/4 of 10/);
    expect(s.caveats.join(" ")).toMatch(/truncated/);
    expect(s.caveats.join(" ")).toMatch(/No README/);
  });
  it("headline prefers description", () => {
    expect(buildSummary(input({ meta: { ...meta, description: "Hello world thing" } })).headline).toBe("Hello world thing");
  });
});

describe("articleFor", () => {
  it("handles vowels and spoken acronyms", async () => {
    const { articleFor } = await import("@/lib/analysis/summary");
    expect(articleFor("HTML")).toBe("An");
    expect(articleFor("Elixir")).toBe("An");
    expect(articleFor("R")).toBe("An");
    expect(articleFor("Go")).toBe("A");
    expect(articleFor("TypeScript")).toBe("A");
    expect(articleFor("Haskell")).toBe("A");
  });
});
