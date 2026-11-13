import type { TreeEntry } from "./types";

export interface DirNode {
  name: string;
  path: string;
  dirs: DirNode[];
  files: { name: string; path: string; size?: number }[];
  fileCount: number;
}

/** Turn GitHub's flat path list into a nested tree, folders first, alphabetical. */
export function buildTree(entries: TreeEntry[]): DirNode {
  const root: DirNode = { name: "", path: "", dirs: [], files: [], fileCount: 0 };
  const index = new Map<string, DirNode>([["", root]]);

  const ensureDir = (path: string): DirNode => {
    const existing = index.get(path);
    if (existing) return existing;
    const slash = path.lastIndexOf("/");
    const parent = ensureDir(slash === -1 ? "" : path.slice(0, slash));
    const node: DirNode = { name: path.slice(slash + 1), path, dirs: [], files: [], fileCount: 0 };
    parent.dirs.push(node);
    index.set(path, node);
    return node;
  };

  for (const e of entries) {
    if (e.type === "tree") ensureDir(e.path);
    else {
      const slash = e.path.lastIndexOf("/");
      const dir = ensureDir(slash === -1 ? "" : e.path.slice(0, slash));
      dir.files.push({ name: e.path.slice(slash + 1), path: e.path, size: e.size });
    }
  }

  const finalize = (n: DirNode): number => {
    n.dirs.sort((a, b) => a.name.localeCompare(b.name));
    n.files.sort((a, b) => a.name.localeCompare(b.name));
    n.fileCount = n.files.length + n.dirs.reduce((s, d) => s + finalize(d), 0);
    return n.fileCount;
  };
  finalize(root);
  return root;
}

/** All ancestor directory paths of a file path ("a/b/c.ts" → ["a", "a/b"]). */
export function ancestors(path: string): string[] {
  const parts = path.split("/");
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join("/"));
}

export function searchPaths(entries: TreeEntry[], query: string, limit = 200): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const scored: { p: string; s: number }[] = [];
  for (const e of entries) {
    if (e.type !== "blob") continue;
    const p = e.path.toLowerCase();
    if (!terms.every((t) => p.includes(t))) continue;
    const base = p.split("/").pop()!;
    scored.push({ p: e.path, s: (base.startsWith(terms[0]) ? 0 : base.includes(terms[0]) ? 1 : 2) * 1000 + p.length });
  }
  return scored.sort((a, b) => a.s - b.s).slice(0, limit).map((x) => x.p);
}

export function formatBytes(n?: number): string {
  if (n === undefined) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
