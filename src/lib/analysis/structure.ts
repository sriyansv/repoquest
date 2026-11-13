import type { EntryPoint, TreeEntry } from "../types";
import { isProbablyBinary, isSourceFile } from "./languages";

/** Directories whose children are the "real" modules (src/lib, packages/foo, ...). */
const CONTAINER_DIRS = new Set([
  "src", "lib", "app", "apps", "packages", "pkg", "internal", "cmd", "source", "modules", "services", "crates", "libs",
]);

/** Top-level folders whose children are separately named packages. */
const WORKSPACE_DIRS = new Set(["packages", "apps", "crates", "libs", "modules", "services"]);

/** Second-level folders that usually group several sub-modules (src/components/forms, ...). */
const NESTED_GROUPS = new Set(["components", "features", "routes", "server", "core", "utils", "api"]);

/** Directories we never treat as interesting modules. */
export const IGNORED_DIRS = new Set([
  "node_modules", ".git", "vendor", "dist", "build", "out", ".next", "target", "__pycache__",
  ".venv", "venv", "coverage", ".turbo", ".cache", "bower_components",
]);

export const ROOT_MODULE = "(root)";

/**
 * Map a file path to the module (directory group) it belongs to.
 * Root-level files → "(root)"; `src/lib/y.ts` → "src/lib"; `src/lib/x/y.ts` → "src/lib/x"; `docs/a.md` → "docs".
 */
export function moduleOf(path: string): string {
  const parts = path.split("/");
  if (parts.length === 1) return ROOT_MODULE;
  if (CONTAINER_DIRS.has(parts[0].toLowerCase()) && parts.length >= 3) {
    // Nested containers split one level deeper: src/lib/github/x.ts → src/lib/github.
    // Not inside workspace folders, where the second segment is a package name (packages/core/src/x.ts → packages/core).
    if (
      parts.length >= 4 &&
      !WORKSPACE_DIRS.has(parts[0].toLowerCase()) &&
      (CONTAINER_DIRS.has(parts[1].toLowerCase()) || NESTED_GROUPS.has(parts[1].toLowerCase()))
    ) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    // packages/foo/src/... → packages/foo
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

export function isIgnoredPath(path: string): boolean {
  return path.split("/").some((p) => IGNORED_DIRS.has(p));
}

/** Conventional meaning of common directory names. Only used as a labelled hint. */
const DIR_ROLES: [RegExp, string][] = [
  [/^(test|tests|__tests__|spec|specs|e2e|testing)$/i, "Tests"],
  [/^(docs?|documentation|website)$/i, "Documentation"],
  [/^(examples?|samples?|demos?)$/i, "Examples"],
  [/^\.github$/i, "GitHub config & CI"],
  [/^(scripts?|tools?|bin)$/i, "Scripts & tooling"],
  [/^(components?|ui)$/i, "UI components"],
  [/^(pages|app|routes|views|screens)$/i, "Pages / routes"],
  [/^(api|server|backend|handlers|controllers)$/i, "Server / API"],
  [/^(lib|libs|utils?|helpers|common|shared|core)$/i, "Shared library code"],
  [/^(models?|schemas?|entities|types)$/i, "Data models & types"],
  [/^(config|configs|settings|conf)$/i, "Configuration"],
  [/^(public|static|assets|images|img|media)$/i, "Static assets"],
  [/^(styles?|css|scss)$/i, "Styles"],
  [/^(hooks)$/i, "React hooks"],
  [/^(store|stores|state|redux)$/i, "State management"],
  [/^(migrations?|db|database|prisma)$/i, "Database"],
  [/^(cmd)$/i, "Command entry points"],
  [/^(internal)$/i, "Internal packages"],
  [/^(packages|crates|apps)$/i, "Workspace packages"],
  [/^(i18n|locales?|translations)$/i, "Translations"],
  [/^(games?)$/i, "Games"],
];

export function roleOfModule(moduleId: string): string | null {
  if (moduleId === ROOT_MODULE) return "Top-level files";
  const last = moduleId.split("/").pop() ?? moduleId;
  for (const [re, role] of DIR_ROLES) if (re.test(last)) return role;
  return null;
}

interface Manifests {
  packageJson?: string | null;
  pyproject?: string | null;
  cargoToml?: string | null;
  goMod?: string | null;
}

export function safeJson<T = unknown>(s: string | null | undefined): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export interface PackageJson {
  name?: string;
  description?: string;
  main?: string;
  module?: string;
  bin?: string | Record<string, string>;
  exports?: unknown;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
}

const CONVENTIONAL_ENTRIES: [RegExp, string][] = [
  [/^(src\/)?main\.(ts|tsx|js|jsx|mjs)$/, "Conventional JS/TS entry file"],
  [/^(src\/)?index\.(ts|tsx|js|jsx|mjs)$/, "Conventional JS/TS entry file"],
  [/^(src\/)?(server|app)\.(ts|js|mjs)$/, "Conventional server entry file"],
  [/^(src\/)?app\/page\.(tsx|jsx|js|ts)$/, "Next.js App Router home page"],
  [/^(src\/)?app\/layout\.(tsx|jsx|js|ts)$/, "Next.js App Router root layout"],
  [/^(src\/)?pages\/(index|_app)\.(tsx|jsx|js|ts)$/, "Next.js Pages Router entry"],
  [/^(src\/)?main\.py$/, "Conventional Python entry file"],
  [/^(src\/)?app\.py$/, "Conventional Python app file"],
  [/^manage\.py$/, "Django management entry point"],
  [/(^|\/)__main__\.py$/, "Python package entry point (python -m)"],
  [/^main\.go$/, "Go main package"],
  [/^cmd\/[^/]+\/main\.go$/, "Go command entry point"],
  [/^src\/main\.rs$/, "Rust binary entry point"],
  [/^src\/lib\.rs$/, "Rust library root"],
  [/^index\.html?$/, "Website home page"],
  [/^(src\/)?App\.(tsx|jsx|vue|svelte)$/, "Root UI component"],
  [/(^|\/)Program\.cs$/, "C# program entry point"],
  [/(^|\/)Main\.(java|kt)$/, "JVM main class (by name)"],
  [/^lib\/main\.dart$/, "Flutter/Dart entry point"],
  [/^Dockerfile$/, "Container build definition"],
];

function normalizeRel(p: string): string {
  return p.replace(/^\.\//, "").replace(/^\//, "");
}

/** Find entry points from manifests (confirmed) and filename conventions. */
export function detectEntryPoints(tree: TreeEntry[], manifests: Manifests): EntryPoint[] {
  const files = new Set(tree.filter((e) => e.type === "blob").map((e) => e.path));
  const out: EntryPoint[] = [];
  const seen = new Set<string>();
  const add = (path: string, reason: string, evidence: EntryPoint["evidence"]) => {
    const p = normalizeRel(path);
    if (!files.has(p) || seen.has(p)) return;
    seen.add(p);
    out.push({ path: p, reason, evidence });
  };

  const pkg = safeJson<PackageJson>(manifests.packageJson);
  if (pkg) {
    if (pkg.main) add(pkg.main, 'Declared as "main" in package.json', "confirmed");
    if (pkg.module) add(pkg.module, 'Declared as "module" in package.json', "confirmed");
    const exp = pkg.exports as Record<string, unknown> | string | undefined;
    const dot = typeof exp === "string" ? exp : exp && typeof exp === "object" ? exp["."] : undefined;
    const exportPath = typeof dot === "string" ? dot : dot && typeof dot === "object" ? ((dot as Record<string, unknown>).import ?? (dot as Record<string, unknown>).default) : undefined;
    if (typeof exportPath === "string") add(exportPath, 'Declared in "exports" in package.json', "confirmed");
    // Declared files are often build output (dist/…) that isn't committed. Look for the source file it was built from.
    for (const [field, value] of [["main", pkg.main], ["module", pkg.module], ["exports", exportPath]] as const) {
      if (typeof value !== "string" || files.has(normalizeRel(value))) continue;
      const src = sourceForBuiltPath(normalizeRel(value), files);
      if (src) add(src, `Likely source of "${field}" (${normalizeRel(value)} is build output, not in the repository)`, "convention");
    }
    if (typeof pkg.bin === "string") add(pkg.bin, 'Declared as "bin" in package.json', "confirmed");
    else if (pkg.bin) for (const [name, p] of Object.entries(pkg.bin)) add(p, `CLI command "${name}" in package.json`, "confirmed");
    for (const script of ["start", "dev", "serve"]) {
      const cmd = pkg.scripts?.[script];
      if (!cmd) continue;
      const m = cmd.match(/(?:node|tsx|ts-node|bun|deno run|nodemon)\s+(?:--?\S+\s+)*([\w./-]+\.(?:m?[jt]sx?|cjs))/);
      if (m) add(m[1], `Run by "npm run ${script}"`, "confirmed");
    }
  }

  if (manifests.pyproject) {
    // [project.scripts] name = "pkg.module:func"
    const section = manifests.pyproject.match(/\[project\.scripts\]([\s\S]*?)(\n\[|$)/);
    if (section) {
      for (const m of section[1].matchAll(/^\s*([\w-]+)\s*=\s*"([\w.]+):\w+"/gm)) {
        const mod = m[2].replace(/\./g, "/");
        for (const candidate of [`${mod}.py`, `src/${mod}.py`, `${mod}/__init__.py`, `src/${mod}/__init__.py`]) {
          add(candidate, `CLI command "${m[1]}" in pyproject.toml`, "confirmed");
        }
      }
    }
  }

  if (manifests.cargoToml) {
    for (const m of manifests.cargoToml.matchAll(/\[\[bin\]\][\s\S]*?path\s*=\s*"([^"]+)"/g)) {
      add(m[1], "Binary target in Cargo.toml", "confirmed");
    }
  }

  for (const path of files) {
    for (const [re, reason] of CONVENTIONAL_ENTRIES) {
      if (re.test(path)) {
        add(path, reason, "convention");
        break;
      }
    }
  }

  // Confirmed first, then code before build files (Dockerfile), then shallow paths first.
  const rank = (e: EntryPoint) => (e.evidence === "confirmed" ? 0 : /(^|\/)Dockerfile$/.test(e.path) ? 2 : 1);
  return out
    .sort((a, b) => rank(a) - rank(b) || a.path.split("/").length - b.path.split("/").length)
    .slice(0, 12);
}

const MANIFEST_NAMES = new Set([
  "package.json", "pyproject.toml", "setup.py", "requirements.txt", "cargo.toml", "go.mod",
  "pom.xml", "build.gradle", "build.gradle.kts", "gemfile", "composer.json", "tsconfig.json",
  "makefile", "dockerfile", "docker-compose.yml", "docker-compose.yaml", "pubspec.yaml", "mix.exs",
]);

export function isManifest(path: string): boolean {
  return MANIFEST_NAMES.has(path.toLowerCase());
}

/**
 * Choose which files to download and read. We spread the budget across modules
 * (round-robin) so the architecture graph covers the whole project rather than
 * the first directory alphabetically.
 */
export function selectFilesToAnalyze(
  tree: TreeEntry[],
  entryPoints: EntryPoint[],
  budget = 80,
  maxFileBytes = 120_000,
): string[] {
  const chosen = new Set<string>();
  const candidates = tree.filter(
    (e) =>
      e.type === "blob" &&
      !isIgnoredPath(e.path) &&
      !isProbablyBinary(e.path) &&
      (e.size ?? 0) <= maxFileBytes &&
      e.size !== 0 && // empty files (e.g. __init__.py markers) contain no imports
      isSourceFile(e.path) &&
      !/\.min\.(js|css)$/.test(e.path) &&
      !/\.d\.ts$/.test(e.path),
  );

  for (const ep of entryPoints) if (chosen.size < budget && candidates.some((c) => c.path === ep.path)) chosen.add(ep.path);

  const score = (p: string) => {
    const depth = p.split("/").length;
    const base = p.split("/").pop()!.toLowerCase();
    let s = depth * 2;
    if (/^(index|main|app|mod|lib)\./.test(base)) s -= 3;
    if (/(test|spec)s?\b|__tests__|\.test\.|\.spec\./i.test(p)) s += 4;
    if (/(^|\/)(examples?|docs?|fixtures?|benchmarks?)\//i.test(p)) s += 3;
    return s;
  };

  const byModule = new Map<string, string[]>();
  for (const c of candidates) {
    const m = moduleOf(c.path);
    if (!byModule.has(m)) byModule.set(m, []);
    byModule.get(m)!.push(c.path);
  }
  const queues = [...byModule.values()].map((list) => list.sort((a, b) => score(a) - score(b) || a.localeCompare(b)));

  let progressed = true;
  while (chosen.size < budget && progressed) {
    progressed = false;
    for (const q of queues) {
      while (q.length && chosen.has(q[0])) q.shift();
      const next = q.shift();
      if (next && chosen.size < budget) {
        chosen.add(next);
        progressed = true;
      }
    }
  }
  return [...chosen];
}

/** Map a build-output path (dist/index.js, distribution/source/index.js) to a committed source file, if one exists. */
export function sourceForBuiltPath(path: string, files: Set<string>): string | null {
  const m = path.match(/^(?:dist|distribution|build|lib|out|esm|cjs)\/(.+)\.(?:m?js|cjs|d\.ts)$/);
  if (!m) return null;
  const rest = m[1];
  const stems = [rest, `src/${rest}`, `source/${rest}`, rest.replace(/^(esm|cjs)\//, "")];
  for (const stem of stems) for (const ext of ["ts", "tsx", "mts", "js", "mjs", "jsx"]) {
    if (files.has(`${stem}.${ext}`)) return `${stem}.${ext}`;
  }
  return null;
}
