import type {
  ArchitectureGraph, EntryPoint, Fact, GroundedSummary, LanguageStat, RepoMeta, TreeEntry,
} from "../types";
import { traceExecutionFlow } from "./graph";
import { safeJson, type PackageJson } from "./structure";

/**
 * Builds a summary purely from facts found in the repository. Every statement
 * carries the file it came from, so nothing is invented. This works with no
 * AI provider configured and is also given to the AI as grounding context.
 */

const KNOWN_PACKAGES: Record<string, string> = {
  next: "Next.js (React framework)",
  react: "React (UI library)",
  vue: "Vue (UI framework)",
  nuxt: "Nuxt (Vue framework)",
  svelte: "Svelte (UI framework)",
  "@sveltejs/kit": "SvelteKit",
  "@angular/core": "Angular",
  "solid-js": "SolidJS",
  astro: "Astro (site framework)",
  express: "Express (Node.js web server)",
  fastify: "Fastify (Node.js web server)",
  koa: "Koa (Node.js web server)",
  hono: "Hono (web framework)",
  "@nestjs/core": "NestJS (Node.js framework)",
  electron: "Electron (desktop apps)",
  "react-native": "React Native (mobile apps)",
  expo: "Expo (React Native tooling)",
  vite: "Vite (build tool)",
  webpack: "webpack (bundler)",
  tailwindcss: "Tailwind CSS (styling)",
  typescript: "TypeScript",
  prisma: "Prisma (database ORM)",
  "@prisma/client": "Prisma (database ORM)",
  "drizzle-orm": "Drizzle (database ORM)",
  mongoose: "Mongoose (MongoDB)",
  graphql: "GraphQL",
  "@apollo/client": "Apollo Client (GraphQL)",
  redux: "Redux (state management)",
  "@reduxjs/toolkit": "Redux Toolkit (state management)",
  zustand: "Zustand (state management)",
  "three": "three.js (3D graphics)",
  "socket.io": "Socket.IO (realtime)",
  jest: "Jest (testing)",
  vitest: "Vitest (testing)",
  mocha: "Mocha (testing)",
  "@playwright/test": "Playwright (browser testing)",
  cypress: "Cypress (browser testing)",
  eslint: "ESLint (linting)",
  "@anthropic-ai/sdk": "Anthropic SDK (Claude API)",
  openai: "OpenAI SDK",
  "@xyflow/react": "React Flow (diagrams)",
  d3: "D3 (data visualization)",
  zod: "Zod (validation)",
};

const KNOWN_PY: Record<string, string> = {
  django: "Django (web framework)",
  flask: "Flask (web framework)",
  fastapi: "FastAPI (web framework)",
  numpy: "NumPy (numerical computing)",
  pandas: "pandas (data analysis)",
  torch: "PyTorch (machine learning)",
  tensorflow: "TensorFlow (machine learning)",
  "scikit-learn": "scikit-learn (machine learning)",
  pytest: "pytest (testing)",
  requests: "Requests (HTTP client)",
  sqlalchemy: "SQLAlchemy (database ORM)",
  pydantic: "Pydantic (data validation)",
  click: "Click (CLI framework)",
  typer: "Typer (CLI framework)",
  streamlit: "Streamlit (data apps)",
};

const KNOWN_RS: Record<string, string> = {
  tokio: "Tokio (async runtime)",
  serde: "Serde (serialization)",
  clap: "clap (CLI parsing)",
  axum: "Axum (web framework)",
  actix_web: "Actix Web (web framework)",
  "actix-web": "Actix Web (web framework)",
  reqwest: "reqwest (HTTP client)",
};

export interface SummaryInput {
  meta: RepoMeta;
  tree: TreeEntry[];
  readme: { path: string; content: string } | null;
  languages: LanguageStat[];
  entryPoints: EntryPoint[];
  graph: ArchitectureGraph;
  manifests: Record<string, string | null>;
  analyzedSourceFiles: number;
  totalSourceFiles: number;
  treeTruncated: boolean;
}

/** Extract the first real prose paragraph from a README (skipping badges, headings, HTML). */
export function readmeIntro(md: string): string | null {
  const text = md
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/<[^>]+>/g, " ");
  const paragraphs = text.split(/\n\s*\n/);
  for (const raw of paragraphs) {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !/^#/.test(l) && !/^[-=*_]{3,}$/.test(l) && !/^\|/.test(l) && !/^[-*+]\s/.test(l) && !/^>\s*\[!/.test(l));
    let p = lines.join(" ");
    p = p
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images/badges
      .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\((?:[^()]|\([^()]*\))*\)/g, "$1") // links → text
      .replace(/[*_`]{1,3}([^*_`]+)[*_`]{1,3}/g, "$1")
      .replace(/^>\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
    const words = p.split(" ").filter((w) => /[a-z]{2,}/i.test(w));
    if (words.length >= 6 && p.length >= 40) return p.length > 600 ? p.slice(0, 597).replace(/\s+\S*$/, "") + "…" : p;
  }
  return null;
}

/** Headings in the README that describe setup. */
export function readmeSetupHeadings(md: string): string[] {
  const out: string[] = [];
  for (const m of md.matchAll(/^#{1,4}\s+(.+?)\s*#*\s*$/gm)) {
    const h = m[1].replace(/[*_`]|<[^>]+>|:[a-z_]+:/g, "").trim();
    if (/install|getting started|quick ?start|setup|set up|usage|development|build|running|run locally/i.test(h)) out.push(h);
  }
  return [...new Set(out)].slice(0, 5);
}

export function buildSummary(input: SummaryInput): GroundedSummary {
  const { meta, tree, readme, manifests } = input;
  const files = new Set(tree.filter((e) => e.type === "blob").map((e) => e.path));
  const pkg = safeJson<PackageJson>(manifests["package.json"]);

  const whatItDoes: Fact[] = [];
  if (meta.description) whatItDoes.push({ text: meta.description, source: "GitHub repository description" });
  const intro = readme ? readmeIntro(readme.content) : null;
  if (intro && intro !== meta.description) whatItDoes.push({ text: intro, source: readme!.path });
  if (pkg?.description && pkg.description !== meta.description) whatItDoes.push({ text: pkg.description, source: "package.json" });
  if (meta.topics.length) whatItDoes.push({ text: `Tagged with topics: ${meta.topics.slice(0, 8).join(", ")}.`, source: "GitHub repository topics" });

  // --- tech stack -------------------------------------------------------
  const techStack: Fact[] = [];
  if (input.languages.length) {
    const top = input.languages.slice(0, 4).map((l) => `${l.language} (${l.percent}%)`).join(", ");
    techStack.push({ text: `Written mostly in ${top}.`, source: "GitHub languages API" });
  }
  if (pkg) {
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const found = Object.keys(deps).filter((d) => KNOWN_PACKAGES[d]).map((d) => KNOWN_PACKAGES[d]);
    if (found.length) techStack.push({ text: `Uses ${[...new Set(found)].slice(0, 10).join(", ")}.`, source: "package.json" });
    const total = Object.keys(deps).length;
    if (total) techStack.push({ text: `Declares ${total} npm dependencies.`, source: "package.json" });
  }
  const pyDeps = `${manifests["requirements.txt"] ?? ""}\n${manifests["pyproject.toml"] ?? ""}`.toLowerCase();
  const pyFound = Object.keys(KNOWN_PY).filter((d) => new RegExp(`(^|[\\s"'\\[,])${d.replace(/[-]/g, "[-_]")}([\\s<>=~!;\\[,"']|$)`, "m").test(pyDeps));
  if (pyFound.length) {
    techStack.push({
      text: `Uses ${pyFound.map((d) => KNOWN_PY[d]).join(", ")}.`,
      source: manifests["pyproject.toml"] ? "pyproject.toml" : "requirements.txt",
    });
  }
  if (manifests["Cargo.toml"]) {
    const rs = Object.keys(KNOWN_RS).filter((d) => new RegExp(`^\\s*${d}\\s*=`, "m").test(manifests["Cargo.toml"]!));
    if (rs.length) techStack.push({ text: `Uses ${rs.map((d) => KNOWN_RS[d]).join(", ")}.`, source: "Cargo.toml" });
  }
  if (manifests["go.mod"]) {
    const goVer = manifests["go.mod"].match(/^go\s+([\d.]+)/m)?.[1];
    const mod = manifests["go.mod"].match(/^module\s+(\S+)/m)?.[1];
    techStack.push({ text: `Go module${mod ? ` \`${mod}\`` : ""}${goVer ? `, targeting Go ${goVer}` : ""}.`, source: "go.mod" });
  }
  if (files.has("Dockerfile")) techStack.push({ text: "Includes a Dockerfile for container builds.", source: "Dockerfile" });
  if ([...files].some((f) => f.startsWith(".github/workflows/"))) {
    techStack.push({ text: "Runs GitHub Actions workflows (CI/CD).", source: ".github/workflows/" });
  }

  // --- how to run ---------------------------------------------------------
  const howToRun: Fact[] = [];
  const pm = files.has("pnpm-lock.yaml") ? "pnpm" : files.has("yarn.lock") ? "yarn" : files.has("bun.lockb") || files.has("bun.lock") ? "bun" : "npm";
  if (pkg) {
    howToRun.push({ text: `Install dependencies with \`${pm} install\`.`, source: pm === "npm" ? "package.json" : `${pm} lockfile` });
    for (const s of ["dev", "start", "build", "test", "lint"]) {
      const cmd = pkg.scripts?.[s];
      if (cmd) howToRun.push({ text: `\`${pm === "npm" ? "npm run" : pm} ${s}\` runs \`${cmd.length > 80 ? cmd.slice(0, 77) + "…" : cmd}\`.`, source: "package.json scripts" });
    }
  }
  if (manifests["requirements.txt"] !== undefined && manifests["requirements.txt"] !== null) {
    howToRun.push({ text: "Install Python dependencies with `pip install -r requirements.txt`.", source: "requirements.txt" });
  } else if (manifests["pyproject.toml"]) {
    howToRun.push({ text: "Install the Python package with `pip install -e .` (it has a pyproject.toml).", source: "pyproject.toml" });
  }
  if (manifests["Cargo.toml"]) howToRun.push({ text: "Build and run with `cargo run`; test with `cargo test`.", source: "Cargo.toml" });
  if (manifests["go.mod"]) howToRun.push({ text: "Build with `go build ./...`; test with `go test ./...`.", source: "go.mod" });
  if (manifests["Makefile"]) {
    const targets = [...manifests["Makefile"].matchAll(/^([a-zA-Z][\w-]*):(?!=)/gm)].map((m) => m[1]).slice(0, 6);
    if (targets.length) howToRun.push({ text: `Makefile targets: ${targets.map((t) => `\`make ${t}\``).join(", ")}.`, source: "Makefile" });
  }
  if (!howToRun.length && files.has("index.html")) {
    howToRun.push({ text: "No build tooling found: this looks like a static site. Open `index.html` in a browser or serve the folder with any static server.", source: "repository tree" });
  }
  if (readme) {
    const heads = readmeSetupHeadings(readme.content);
    if (heads.length) howToRun.push({ text: `The README has setup sections: ${heads.map((h) => `“${h}”`).join(", ")}.`, source: readme.path });
  }

  // --- structure ----------------------------------------------------------
  const structure: Fact[] = input.graph.nodes
    .slice()
    .sort((a, b) => b.fileCount - a.fileCount)
    .slice(0, 8)
    .map((n) => ({
      text: `${n.label === "root files" ? "Root" : `\`${n.label}/\``}: ${n.fileCount} file${n.fileCount === 1 ? "" : "s"}${n.languages.length ? ` (${n.languages.join(", ")})` : ""}${n.role && n.id !== "(root)" ? ` — likely ${n.role.toLowerCase()} (by folder name)` : ""}.`,
      source: "repository tree",
    }));

  const caveats: string[] = [];
  if (input.totalSourceFiles > input.analyzedSourceFiles) {
    caveats.push(`Imports were read from ${input.analyzedSourceFiles} of ${input.totalSourceFiles} source files, so some relationships may be missing.`);
  }
  if (input.treeTruncated) caveats.push("This repository is very large; GitHub returned a truncated file list.");
  if (!readme) caveats.push("No README was found, so the purpose is inferred only from metadata and code.");
  if (!input.entryPoints.length) caveats.push("No obvious entry point was found.");

  const headline =
    meta.description ??
    (intro ? intro.split(/(?<=[.!?])\s/)[0] : null) ??
    `${articleFor(meta.primaryLanguage ?? "software")} ${meta.primaryLanguage ?? "software"} project by ${meta.owner}.`;

  return {
    headline,
    whatItDoes,
    techStack,
    howToRun,
    structure,
    executionFlow: traceExecutionFlow(input.entryPoints, input.graph.fileDependencies),
    caveats,
  };
}

/** "A"/"An", including acronyms read letter by letter ("An HTML", "An SQL", "A Go"). */
export function articleFor(word: string): "An" | "A" {
  if (/^[AEIOU]/i.test(word) || /^[FHLMNRSX]([A-Z0-9+#]|$)/.test(word)) return "An";
  return "A";
}
