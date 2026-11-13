/**
 * Helpers for reading package.json fields that come in several shapes.
 */

/**
 * The file a package's root export points to. Handles every common form of "exports":
 *   "./index.js"
 *   { ".": "./index.js" }
 *   { ".": { "import": "./index.js", "default": "./index.cjs" } }
 *   { "types": "./index.d.ts", "default": "./index.js" }   (conditions at the top level)
 */
export function exportsEntry(exports: unknown): string | null {
  if (typeof exports === "string") return exports;
  if (!exports || typeof exports !== "object" || Array.isArray(exports)) return null;
  const obj = exports as Record<string, unknown>;
  const keys = Object.keys(obj);
  const isSubpathMap = keys.some((k) => k.startsWith("."));
  const target = isSubpathMap ? obj["."] : obj;
  return conditionTarget(target);
}

function conditionTarget(target: unknown, depth = 0): string | null {
  if (typeof target === "string") return target;
  if (!target || typeof target !== "object" || depth > 4) return null;
  const obj = target as Record<string, unknown>;
  for (const cond of ["source", "import", "module", "default", "require", "node"]) {
    if (cond in obj) {
      const hit = conditionTarget(obj[cond], depth + 1);
      if (hit && !hit.endsWith(".d.ts")) return hit;
    }
  }
  return null;
}

/**
 * Sub-directory an npm script runs in, for monorepo scripts like
 * `yarn --cwd ./app start`, `npm --prefix app run dev`, `cd app && vite`,
 * `pnpm --filter ./app dev`, `npm run dev -w app`.
 */
export function scriptWorkingDir(script: string): string | null {
  const m =
    script.match(/--cwd[= ]+["']?\.?\/?([\w@./-]+)/) ??
    script.match(/--prefix[= ]+["']?\.?\/?([\w@./-]+)/) ??
    script.match(/(?:^|&&|;)\s*cd\s+["']?\.?\/?([\w@./-]+)/) ??
    script.match(/--filter[= ]+["']?\.\/([\w@./-]+)/) ??
    script.match(/(?:-w|--workspace)[= ]+["']?\.?\/?([\w@./-]+)/);
  const dir = m?.[1]?.replace(/\/$/, "");
  return dir && dir !== "." && !dir.includes("..") ? dir : null;
}
