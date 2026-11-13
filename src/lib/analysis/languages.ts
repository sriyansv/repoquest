import type { LanguageStat, TreeEntry } from "../types";

interface LangDef {
  name: string;
  color: string;
  source: boolean; // counts as "source code" (vs config/docs/data)
}

const L = (name: string, color: string, source = true): LangDef => ({ name, color, source });

const BY_EXT: Record<string, LangDef> = {
  ts: L("TypeScript", "#3178c6"),
  tsx: L("TypeScript", "#3178c6"),
  mts: L("TypeScript", "#3178c6"),
  cts: L("TypeScript", "#3178c6"),
  js: L("JavaScript", "#f1e05a"),
  jsx: L("JavaScript", "#f1e05a"),
  mjs: L("JavaScript", "#f1e05a"),
  cjs: L("JavaScript", "#f1e05a"),
  py: L("Python", "#3572a5"),
  pyi: L("Python", "#3572a5"),
  go: L("Go", "#00add8"),
  rs: L("Rust", "#dea584"),
  java: L("Java", "#b07219"),
  kt: L("Kotlin", "#a97bff"),
  kts: L("Kotlin", "#a97bff"),
  scala: L("Scala", "#c22d40"),
  swift: L("Swift", "#f05138"),
  m: L("Objective-C", "#438eff"),
  c: L("C", "#555555"),
  h: L("C", "#555555"),
  cc: L("C++", "#f34b7d"),
  cpp: L("C++", "#f34b7d"),
  cxx: L("C++", "#f34b7d"),
  hpp: L("C++", "#f34b7d"),
  cs: L("C#", "#178600"),
  fs: L("F#", "#b845fc"),
  rb: L("Ruby", "#701516"),
  php: L("PHP", "#4f5d95"),
  ex: L("Elixir", "#6e4a7e"),
  exs: L("Elixir", "#6e4a7e"),
  erl: L("Erlang", "#b83998"),
  hs: L("Haskell", "#5e5086"),
  lua: L("Lua", "#000080"),
  dart: L("Dart", "#00b4ab"),
  r: L("R", "#198ce7"),
  jl: L("Julia", "#a270ba"),
  zig: L("Zig", "#ec915c"),
  sol: L("Solidity", "#aa6746"),
  vue: L("Vue", "#41b883"),
  svelte: L("Svelte", "#ff3e00"),
  astro: L("Astro", "#ff5a03"),
  html: L("HTML", "#e34c26"),
  htm: L("HTML", "#e34c26"),
  css: L("CSS", "#663399"),
  scss: L("SCSS", "#c6538c"),
  sass: L("SCSS", "#c6538c"),
  less: L("Less", "#1d365d"),
  sh: L("Shell", "#89e051"),
  bash: L("Shell", "#89e051"),
  zsh: L("Shell", "#89e051"),
  ps1: L("PowerShell", "#012456"),
  sql: L("SQL", "#e38c00"),
  graphql: L("GraphQL", "#e10098"),
  proto: L("Protocol Buffers", "#4a90d9", false),
  md: L("Markdown", "#083fa1", false),
  mdx: L("MDX", "#fcb32c", false),
  json: L("JSON", "#292929", false),
  yaml: L("YAML", "#cb171e", false),
  yml: L("YAML", "#cb171e", false),
  toml: L("TOML", "#9c4221", false),
  xml: L("XML", "#0060ac", false),
};

const BY_NAME: Record<string, LangDef> = {
  dockerfile: L("Dockerfile", "#384d54", false),
  makefile: L("Makefile", "#427819", false),
  gemfile: L("Ruby", "#701516", false),
  rakefile: L("Ruby", "#701516"),
};

export function extOf(path: string): string {
  const base = path.split("/").pop() ?? path;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function languageOf(path: string): LangDef | null {
  const base = (path.split("/").pop() ?? "").toLowerCase();
  return BY_NAME[base] ?? BY_EXT[extOf(path)] ?? null;
}

export function isSourceFile(path: string): boolean {
  return Boolean(languageOf(path)?.source);
}

/** Highlight.js-style language id used by the code viewer. */
export function languageId(path: string): string {
  return languageOf(path)?.name.toLowerCase().replace(/[^a-z0-9+#]/g, "") ?? "text";
}

const BINARY_EXT = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff", "avif", "psd",
  "mp3", "mp4", "wav", "ogg", "webm", "mov", "avi", "flac",
  "zip", "gz", "tgz", "bz2", "xz", "7z", "rar", "jar", "war",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "woff", "woff2", "ttf", "otf", "eot",
  "exe", "dll", "so", "dylib", "bin", "o", "a", "class", "pyc", "wasm",
  "lock", "sqlite", "db",
]);

export function isProbablyBinary(path: string): boolean {
  return BINARY_EXT.has(extOf(path));
}

/** Compute language percentages. Prefer GitHub's byte counts; fall back to tree sizes. */
export function computeLanguages(
  githubBytes: Record<string, number> | null,
  tree: TreeEntry[],
): LanguageStat[] {
  let bytes: Record<string, number> = {};
  if (githubBytes && Object.keys(githubBytes).length) {
    bytes = githubBytes;
  } else {
    for (const e of tree) {
      if (e.type !== "blob") continue;
      const lang = languageOf(e.path);
      if (!lang || !lang.source) continue;
      bytes[lang.name] = (bytes[lang.name] ?? 0) + (e.size ?? 0);
    }
  }
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  if (!total) return [];
  const colorFor = (name: string) =>
    Object.values(BY_EXT).find((d) => d.name === name)?.color ?? colorFromString(name);
  return Object.entries(bytes)
    .sort((a, b) => b[1] - a[1])
    .map(([language, b]) => ({
      language,
      bytes: b,
      percent: Math.round((b / total) * 1000) / 10,
      color: colorFor(language),
    }));
}

function colorFromString(s: string): string {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 55%)`;
}
