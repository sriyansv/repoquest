import type { DependencyRelation } from "../types";
import { extOf } from "./languages";
import { exportsEntry } from "./manifest";

/**
 * Lightweight, regex-based import extraction.
 *
 * We deliberately avoid a full parser (tree-sitter WASM bundles are several MB).
 * The trade-off: we only report an edge as "confirmed" when an import statement
 * literally names a file that exists in the repository tree. Anything we cannot
 * resolve is either an external package or ignored - never guessed.
 */

export interface RawImport {
  specifier: string;
  kind: "relative" | "absolute" | "package";
  relation?: DependencyRelation;
}

/** Remove comments so commented-out imports are not reported. Keeps line structure. */
export function stripComments(code: string, style: "c" | "hash" | "html"): string {
  if (style === "html") return code.replace(/<!--[\s\S]*?-->/g, "");
  if (style === "hash") return code.replace(/(^|[^\\"'])#.*$/gm, "$1");
  // C-style: block + line comments, avoiding "//" inside strings like "https://".
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

const RUST_BUILTIN = new Set(["crate", "self", "super", "std", "core", "alloc", "proc_macro", "test"]);

const JS_EXT = ["ts", "tsx", "js", "jsx", "mjs", "cjs", "mts", "cts", "vue", "svelte", "astro"];
const PY_EXT = ["py", "pyi"];

export function extractImports(path: string, code: string, ctx: { goModule?: string | null } = {}): RawImport[] {
  const ext = extOf(path);
  const out: RawImport[] = [];
  const push = (spec: string, relation: DependencyRelation = "import") => {
    const s = spec.trim();
    if (!s || s.length > 300) return;
    out.push({ specifier: s, kind: s.startsWith(".") ? "relative" : s.startsWith("/") ? "absolute" : "package", relation });
  };

  if (JS_EXT.includes(ext)) {
    const src = stripComments(code, "c");
    const res = [
      /\bimport\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"'\n]+)["']/g,
      /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s*(?:as\s+\w+\s+)?from\s+["']([^"'\n]+)["']/g,
      /\brequire\(\s*["']([^"'\n]+)["']\s*\)/g,
      /\bimport\(\s*["']([^"'\n]+)["']\s*\)/g,
    ];
    for (const re of res) for (const m of src.matchAll(re)) push(m[1]);
  } else if (PY_EXT.includes(ext)) {
    const src = stripComments(code, "hash");
    // Names may span lines only inside parentheses: `from x import (a,\n b)`.
    for (const m of src.matchAll(/^[ \t]*from[ \t]+(\.+[\w.]*|[\w.]+)[ \t]+import[ \t]+(\([^)]*\)|[^\n]+)/gm)) {
      const base = m[1];
      if (/^\.+$/.test(base)) {
        // `from . import a, b` → each name is a sibling module
        for (const part of m[2].replace(/[()]/g, "").split(",")) {
          const name = part.trim().split(/\s+/)[0];
          if (name && /^\w+$/.test(name)) push(`${base}${name}`);
        }
      } else push(base);
    }
    for (const m of src.matchAll(/^[ \t]*import[ \t]+([\w., \t]+)$/gm)) {
      for (const part of m[1].split(",")) push(part.trim().split(/\s+as\s+/)[0]);
    }
  } else if (ext === "go") {
    const src = stripComments(code, "c");
    const blocks = [...src.matchAll(/\bimport\s*\(([\s\S]*?)\)/g)].map((m) => m[1]);
    const singles = [...src.matchAll(/\bimport\s+(?:\w+\s+)?"([^"]+)"/g)].map((m) => `"${m[1]}"`);
    for (const b of [...blocks, ...singles]) for (const m of b.matchAll(/"([^"]+)"/g)) {
      const spec = m[1];
      if (ctx.goModule && (spec === ctx.goModule || spec.startsWith(ctx.goModule + "/"))) {
        out.push({ specifier: spec.slice(ctx.goModule.length).replace(/^\//, "") || ".", kind: "absolute" });
      } else out.push({ specifier: spec, kind: "package" });
    }
  } else if (ext === "rs") {
    const src = stripComments(code, "c");
    for (const m of src.matchAll(/^\s*(?:pub(?:\([\w]+\))?\s+)?mod\s+(\w+)\s*;/gm)) out.push({ specifier: `mod:${m[1]}`, kind: "relative" });
    for (const m of src.matchAll(/^\s*(?:pub\s+)?use\s+crate::([\w:]+)/gm)) out.push({ specifier: `crate:${m[1]}`, kind: "absolute" });
    // `use other_crate::x` / `extern crate other_crate`: resolvable only to workspace crates.
    const seenCrates = new Set<string>();
    for (const m of src.matchAll(/^\s*(?:pub(?:\([\w]+\))?\s+)?(?:use\s+(?:::)?(\w+)::|extern\s+crate\s+(\w+))/gm)) {
      const name = m[1] ?? m[2];
      if (RUST_BUILTIN.has(name) || seenCrates.has(name)) continue;
      seenCrates.add(name);
      out.push({ specifier: `rsuse:${name}`, kind: "package" });
    }
  } else if (ext === "java" || ext === "kt" || ext === "scala") {
    const src = stripComments(code, "c");
    for (const m of src.matchAll(/^\s*import\s+(?:static\s+)?([\w.]+)(?:\.\*)?;?\s*$/gm)) out.push({ specifier: `jvm:${m[1]}`, kind: "absolute" });
  } else if (["c", "h", "cc", "cpp", "cxx", "hpp"].includes(ext)) {
    const src = stripComments(code, "c");
    for (const m of src.matchAll(/^\s*#\s*include\s+"([^"]+)"/gm)) out.push({ specifier: m[1], kind: "relative" });
  } else if (ext === "rb") {
    const src = stripComments(code, "hash");
    for (const m of src.matchAll(/\brequire_relative\s+["']([^"']+)["']/g)) out.push({ specifier: m[1].startsWith(".") ? m[1] : `./${m[1]}`, kind: "relative" });
  } else if (ext === "html" || ext === "htm") {
    const src = stripComments(code, "html");
    for (const m of src.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) push(m[1], "script");
    for (const m of src.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["']/gi)) push(m[1], "stylesheet");
    for (const m of src.matchAll(/<a\b[^>]*\bhref=["']([^"'#?]+\.html?)(?:[#?][^"']*)?["']/gi)) push(m[1], "link");
  } else if (ext === "css" || ext === "scss" || ext === "less") {
    const src = stripComments(code, "c");
    for (const m of src.matchAll(/@(?:import|use|forward)\s+(?:url\()?["']([^"']+)["']/g)) push(m[1], "stylesheet");
  }

  // HTML/CSS: treat bare relative names ("style.css") as relative, drop URLs.
  if (["html", "htm", "css", "scss", "less"].includes(ext)) {
    return out
      .filter((i) => !/^(https?:)?\/\//i.test(i.specifier) && !/^(data|mailto|javascript):/i.test(i.specifier))
      .map((i) => (i.kind === "package" ? { ...i, specifier: `./${i.specifier}`, kind: "relative" as const } : i));
  }
  return out;
}

/** A package that lives inside this repository (JS workspace package or Rust workspace crate). */
export interface WorkspacePackage {
  name: string;
  dir: string;
  /** The file an import of the bare package name lands on, if we could determine it. */
  entry: string | null;
}

export interface ResolveContext {
  files: Set<string>;
  /** Workspace packages keyed by import name (JS: package name; Rust: `rs:` + crate name with underscores). */
  workspace?: Map<string, WorkspacePackage>;
  /** tsconfig-style path aliases, e.g. { "@/": "src/" } */
  aliases: Record<string, string>;
}

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

export function joinPath(base: string, rel: string): string | null {
  const parts = base ? base.split("/") : [];
  for (const seg of rel.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (!parts.length) return null; // escapes repository root
      parts.pop();
    } else parts.push(seg);
  }
  return parts.join("/");
}

function tryCandidates(base: string, exts: string[], files: Set<string>, indexNames: string[]): string | null {
  const clean = base.replace(/\?.*$/, "");
  if (files.has(clean)) return clean;
  // TS projects import "./foo.js" that is really "./foo.ts".
  const noJs = clean.replace(/\.(m?js|cjs|jsx)$/, "");
  for (const e of exts) {
    if (files.has(`${clean}.${e}`)) return `${clean}.${e}`;
    if (noJs !== clean && files.has(`${noJs}.${e}`)) return `${noJs}.${e}`;
  }
  for (const idx of indexNames) for (const e of exts) {
    const p = clean ? `${clean}/${idx}.${e}` : `${idx}.${e}`;
    if (files.has(p)) return p;
  }
  return null;
}

/** Resolve an import to a file in the repo, or return null if it is external/unresolvable. */
export function resolveImport(fromPath: string, imp: RawImport, ctx: ResolveContext): string | null {
  const ext = extOf(fromPath);
  const dir = dirname(fromPath);
  const { files } = ctx;
  const spec = imp.specifier;

  if (JS_EXT.includes(ext) || ["html", "htm", "css", "scss", "less"].includes(ext)) {
    let target: string | null = null;
    if (imp.kind === "relative") target = joinPath(dir, spec);
    else if (imp.kind === "absolute") target = joinPath("", spec);
    else {
      for (const [alias, to] of Object.entries(ctx.aliases)) {
        if (spec.startsWith(alias)) {
          target = joinPath("", to + spec.slice(alias.length));
          break;
        }
      }
      if (target === null && ctx.workspace) return resolveWorkspaceJs(spec, ctx.workspace, files);
    }
    if (target === null) return null;
    if (["css", "scss", "less"].includes(ext)) {
      const base = target.split("/").pop() ?? "";
      const partial = target.replace(/[^/]+$/, `_${base}`);
      return tryCandidates(target, ["css", "scss", "sass", "less"], files, ["index", "_index"]) ??
        tryCandidates(partial, ["scss", "sass"], files, []);
    }
    return tryCandidates(target, JS_EXT, files, ["index"]);
  }

  if (PY_EXT.includes(ext)) {
    let modPath: string | null;
    if (spec.startsWith(".")) {
      const dots = spec.match(/^\.+/)![0].length;
      let base: string | null = dir;
      for (let i = 1; i < dots && base !== null; i++) base = base ? dirname(base) : null;
      if (base === null) return null;
      modPath = joinPath(base, spec.slice(dots).replace(/\./g, "/"));
    } else {
      modPath = spec.replace(/\./g, "/");
    }
    if (modPath === null) return null;
    const roots = spec.startsWith(".") ? [""] : ["", "src/", "lib/"];
    for (const root of roots) {
      // Walk up the dotted path: "a.b.c" may be module a/b.py exposing attribute c.
      let p = modPath;
      while (p) {
        const hit = tryCandidates(root + p, PY_EXT, files, ["__init__"]);
        if (hit) return hit;
        if (!p.includes("/")) break;
        p = dirname(p);
      }
    }
    return null;
  }

  if (ext === "go" && imp.kind === "absolute") {
    // A Go import names a package directory; link to the first .go file in it.
    const pkgDir = spec === "." ? "" : spec;
    const prefix = pkgDir ? pkgDir + "/" : "";
    for (const f of files) {
      if (f.startsWith(prefix) && f.endsWith(".go") && !f.slice(prefix.length).includes("/") && !f.endsWith("_test.go")) return f;
    }
    return null;
  }

  if (ext === "rs") {
    if (spec.startsWith("mod:")) {
      const name = spec.slice(4);
      const base = fromPath.endsWith("/mod.rs") || /(^|\/)(main|lib)\.rs$/.test(fromPath) ? dir : fromPath.replace(/\.rs$/, "");
      return tryCandidates(joinPath(base, name) ?? "", ["rs"], files, ["mod"]);
    }
    if (spec.startsWith("rsuse:")) return ctx.workspace?.get(`rs:${spec.slice(6)}`)?.entry ?? null;
    if (spec.startsWith("crate:")) {
      const parts = spec.slice(6).split("::");
      const srcRoot = fromPath.includes("src/") ? fromPath.slice(0, fromPath.indexOf("src/") + 4) : "src/";
      for (let n = parts.length; n > 0; n--) {
        const hit = tryCandidates(srcRoot + parts.slice(0, n).join("/"), ["rs"], files, ["mod"]);
        if (hit) return hit;
      }
    }
    return null;
  }

  if (spec.startsWith("jvm:")) {
    const suffix = "/" + spec.slice(4).replace(/\./g, "/");
    for (const e of ["java", "kt", "scala"]) {
      for (const f of files) if (f.endsWith(`${suffix}.${e}`) || f === `${suffix.slice(1)}.${e}`) return f;
    }
    return null;
  }

  if (["c", "h", "cc", "cpp", "cxx", "hpp"].includes(ext)) {
    const rel = joinPath(dir, spec);
    if (rel && files.has(rel)) return rel;
    for (const root of ["include/", "src/", ""]) {
      const p = joinPath("", root + spec);
      if (p && files.has(p)) return p;
    }
    return null;
  }

  if (ext === "rb") {
    const p = joinPath(dir, spec);
    return p ? tryCandidates(p, ["rb"], files, []) : null;
  }

  return null;
}

/** Name of an external package from a bare specifier (`@scope/pkg/sub` → `@scope/pkg`). */
export function packageName(spec: string): string | null {
  if (spec.startsWith(".") || spec.startsWith("/") || spec.includes(":") && !spec.startsWith("node:")) return null;
  if (spec.startsWith("node:")) return spec;
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/** Read `compilerOptions.paths` from a tsconfig to resolve aliases like "@/*". */
export function aliasesFromTsconfig(tsconfig: string | null, files: Set<string>): Record<string, string> {
  const aliases: Record<string, string> = {};
  if (tsconfig) {
    // tsconfig allows comments and trailing commas.
    const cleaned = stripComments(tsconfig, "c").replace(/,(\s*[}\]])/g, "$1");
    try {
      const json = JSON.parse(cleaned) as { compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> } };
      const baseUrl = (json.compilerOptions?.baseUrl ?? ".").replace(/^\.\/?/, "");
      for (const [key, targets] of Object.entries(json.compilerOptions?.paths ?? {})) {
        if (!key.endsWith("/*") || !targets?.[0]?.endsWith("/*")) continue;
        const to = joinPath(baseUrl, targets[0].slice(0, -2).replace(/^\.\//, ""));
        if (to !== null) aliases[key.slice(0, -1)] = to ? `${to}/` : "";
      }
    } catch {
      /* ignore malformed tsconfig */
    }
  }
  if (!Object.keys(aliases).length) {
    // Very common default; only applied when a src/ directory actually exists.
    if ([...files].some((f) => f.startsWith("src/"))) aliases["@/"] = "src/";
    aliases["~/"] = [...files].some((f) => f.startsWith("src/")) ? "src/" : "";
  }
  return aliases;
}

function resolveWorkspaceJs(spec: string, workspace: Map<string, WorkspacePackage>, files: Set<string>): string | null {
  const name = packageName(spec);
  if (!name) return null;
  const pkg = workspace.get(name);
  if (!pkg) return null;
  const sub = spec.slice(name.length).replace(/^\//, "");
  if (!sub) return pkg.entry;
  for (const base of [`${pkg.dir}/${sub}`, `${pkg.dir}/src/${sub}`]) {
    const hit = tryCandidates(base, JS_EXT, files, ["index"]);
    if (hit) return hit;
  }
  return pkg.entry; // subpath we can't map: still a confirmed dependency on the package
}

/**
 * Build the workspace map from package manifests found below the repository root
 * (e.g. packages/foo/package.json, crates/bar/Cargo.toml). Only packages whose
 * directory exists in the tree are included, so every resolved edge is real.
 */
export function workspacePackages(manifests: { path: string; content: string }[], files: Set<string>): Map<string, WorkspacePackage> {
  const out = new Map<string, WorkspacePackage>();
  for (const { path, content } of manifests) {
    const dir = dirname(path);
    if (!dir) continue; // the root manifest is the project itself, not a workspace package
    const file = path.slice(dir.length + 1);
    if (file === "package.json") {
      let json: { name?: unknown; source?: unknown; module?: unknown; main?: unknown; exports?: unknown };
      try {
        json = JSON.parse(content);
      } catch {
        continue;
      }
      if (typeof json.name !== "string" || !json.name) continue;
      const dotPath = exportsEntry(json.exports);
      const candidates = [json.source, json.module, json.main, dotPath]
        .filter((c): c is string => typeof c === "string")
        .map((c) => joinPath(dir, c.replace(/^\.\//, "")))
        .filter((c): c is string => c !== null);
      let entry: string | null = null;
      for (const c of candidates) entry ??= tryCandidates(c, JS_EXT, files, ["index"]);
      for (const c of candidates) entry ??= builtToSource(c, files);
      entry ??= tryCandidates(`${dir}/src/index`, JS_EXT, files, []) ?? tryCandidates(`${dir}/index`, JS_EXT, files, []);
      out.set(json.name, { name: json.name, dir, entry });
    } else if (file === "Cargo.toml") {
      const pkgSection = content.match(/\[package\]([\s\S]*?)(?:\n\[|$)/);
      const name = pkgSection?.[1].match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1];
      if (!name) continue;
      const libPath = content.match(/\[lib\][\s\S]*?^\s*path\s*=\s*"([^"]+)"/m)?.[1];
      const candidates = [libPath ? joinPath(dir, libPath) : null, `${dir}/src/lib.rs`, `${dir}/src/main.rs`];
      const entry = candidates.find((c): c is string => Boolean(c && files.has(c))) ?? null;
      out.set(`rs:${name.replace(/-/g, "_")}`, { name, dir, entry });
    }
  }
  return out;
}

/** dist/x.js inside a package → src/x.ts (or similar) when the built file isn't committed. */
function builtToSource(path: string, files: Set<string>): string | null {
  const m = path.match(/^(.*?)(?:\/|^)(?:dist|distribution|build|lib|out|esm|cjs)\/(.+)\.(?:m?js|cjs)$/);
  if (!m) return null;
  const [, dir, rest] = m;
  const prefix = dir ? `${dir}/` : "";
  for (const stem of [`${prefix}${rest}`, `${prefix}src/${rest}`, `${prefix}source/${rest}`]) {
    for (const ext of ["ts", "tsx", "mts", "js", "jsx"]) if (files.has(`${stem}.${ext}`)) return `${stem}.${ext}`;
  }
  return null;
}
