import type {
  ArchitectureGraph, EntryPoint, FileDependency, FlowStep, ModuleEdge, ModuleNode, SourceFile, TreeEntry,
} from "../types";
import { aliasesFromTsconfig, extractImports, packageName, resolveImport } from "./imports";
import { languageOf } from "./languages";
import { isIgnoredPath, moduleOf, roleOfModule, ROOT_MODULE } from "./structure";

const MAX_NODES = 36;

export const RELATION_VERB: Record<FileDependency["relation"], string> = {
  import: "imports",
  script: "loads script",
  stylesheet: "loads stylesheet",
  link: "links to",
};

export interface GraphInput {
  tree: TreeEntry[];
  files: SourceFile[];
  entryPoints: EntryPoint[];
  tsconfig?: string | null;
  goModule?: string | null;
}

export function buildFileDependencies(input: GraphInput): { deps: FileDependency[]; external: Map<string, number> } {
  const fileSet = new Set(input.tree.filter((e) => e.type === "blob").map((e) => e.path));
  const ctx = { files: fileSet, aliases: aliasesFromTsconfig(input.tsconfig ?? null, fileSet) };
  const deps: FileDependency[] = [];
  const external = new Map<string, number>();
  const seen = new Set<string>();

  for (const f of input.files) {
    const importers = new Set<string>();
    for (const imp of extractImports(f.path, f.content, { goModule: input.goModule })) {
      const target = resolveImport(f.path, imp, ctx);
      if (target && target !== f.path) {
        const key = `${f.path}→${target}`;
        if (!seen.has(key)) {
          seen.add(key);
          deps.push({ from: f.path, to: target, specifier: imp.specifier, relation: imp.relation ?? "import" });
        }
      } else if (!target && imp.kind === "package") {
        const pkg = packageName(imp.specifier);
        if (pkg && !importers.has(pkg)) {
          importers.add(pkg);
          external.set(pkg, (external.get(pkg) ?? 0) + 1);
        }
      }
    }
  }
  return { deps, external };
}

export function buildArchitecture(input: GraphInput): ArchitectureGraph {
  const blobs = input.tree.filter((e) => e.type === "blob" && !isIgnoredPath(e.path));
  const { deps, external } = buildFileDependencies(input);
  const entryModules = new Set(input.entryPoints.map((e) => moduleOf(e.path)));

  // --- nodes -------------------------------------------------------------
  const stats = new Map<string, { count: number; langs: Map<string, number> }>();
  for (const b of blobs) {
    const m = moduleOf(b.path);
    if (!stats.has(m)) stats.set(m, { count: 0, langs: new Map() });
    const s = stats.get(m)!;
    s.count++;
    const lang = languageOf(b.path);
    if (lang?.source) s.langs.set(lang.name, (s.langs.get(lang.name) ?? 0) + 1);
  }

  // --- confirmed edges (aggregated file imports) ---------------------------
  const edgeMap = new Map<string, ModuleEdge>();
  for (const d of deps) {
    const a = moduleOf(d.from);
    const b = moduleOf(d.to);
    if (a === b) continue;
    const id = `${a}→${b}`;
    const e = edgeMap.get(id) ?? { id, source: a, target: b, kind: "confirmed" as const, weight: 0, evidence: [] };
    e.weight++;
    if (e.evidence.length < 5) e.evidence.push(`${d.from} ${RELATION_VERB[d.relation]} ${d.to}`);
    edgeMap.set(id, e);
  }

  const connected = new Set<string>();
  for (const e of edgeMap.values()) connected.add(e.source).add(e.target);

  let moduleIds = [...stats.keys()];
  if (moduleIds.length > MAX_NODES) {
    moduleIds = moduleIds
      .sort((a, b) => {
        const pa = (connected.has(a) ? 2 : 0) + (entryModules.has(a) ? 1 : 0);
        const pb = (connected.has(b) ? 2 : 0) + (entryModules.has(b) ? 1 : 0);
        return pb - pa || stats.get(b)!.count - stats.get(a)!.count;
      })
      .slice(0, MAX_NODES);
  }
  const kept = new Set(moduleIds);

  const nodes: ModuleNode[] = moduleIds.map((id) => {
    const s = stats.get(id)!;
    return {
      id,
      label: id === ROOT_MODULE ? "root files" : id,
      path: id === ROOT_MODULE ? "" : id,
      fileCount: s.count,
      languages: [...s.langs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l]) => l),
      role: roleOfModule(id),
      isEntry: entryModules.has(id),
    };
  });

  const edges: ModuleEdge[] = [...edgeMap.values()].filter((e) => kept.has(e.source) && kept.has(e.target));

  // --- inferred edges (naming conventions only; clearly labelled) -----------
  const primary = nodes
    .filter((n) => n.languages.length && !/^(Tests|Documentation|Examples|Scripts & tooling|GitHub config & CI)$/.test(n.role ?? ""))
    .sort((a, b) => b.fileCount - a.fileCount)[0];
  if (primary) {
    for (const n of nodes) {
      if (n.id === primary.id) continue;
      const hasOutgoing = edges.some((e) => e.source === n.id);
      if (hasOutgoing) continue;
      if (n.role === "Tests" || n.role === "Examples") {
        edges.push({
          id: `${n.id}⇢${primary.id}`,
          source: n.id,
          target: primary.id,
          kind: "inferred",
          weight: 0,
          evidence: [
            `"${n.label}" is conventionally ${n.role === "Tests" ? "test code for" : "example usage of"} the main source module. No import statement in the analyzed files confirms this.`,
          ],
        });
      }
    }
  }

  return {
    nodes,
    edges,
    fileDependencies: deps,
    externalPackages: [...external.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([name, importedBy]) => ({ name, importedBy })),
    analyzedFiles: input.files.length,
  };
}

/** Follow confirmed imports outward from entry points to describe how execution starts. */
export function traceExecutionFlow(entryPoints: EntryPoint[], deps: FileDependency[], maxSteps = 14): FlowStep[] {
  const out = new Map<string, string[]>();
  for (const d of deps) {
    if (d.relation === "link") continue; // hyperlinks are navigation, not execution
    if (!out.has(d.from)) out.set(d.from, []);
    out.get(d.from)!.push(d.to);
  }
  const steps: FlowStep[] = [];
  const visited = new Set<string>();
  const roots = entryPoints.filter((e) => out.has(e.path)).map((e) => e.path).slice(0, 3);
  const queue: { file: string; depth: number }[] = roots.map((file) => ({ file, depth: 0 }));
  while (queue.length && steps.length < maxSteps) {
    const { file, depth } = queue.shift()!;
    if (visited.has(file)) continue;
    visited.add(file);
    const calls = (out.get(file) ?? []).slice(0, 8);
    if (!calls.length) continue;
    steps.push({ depth, file, calls });
    if (depth < 3) for (const c of calls) if (!visited.has(c)) queue.push({ file: c, depth: depth + 1 });
  }
  return steps;
}

export interface Positioned {
  id: string;
  x: number;
  y: number;
}

/**
 * Deterministic layered layout (no extra dependency like dagre):
 * rank = longest path from a source after removing cycle-forming edges.
 * Isolated nodes go into a grid below the graph.
 */
export function layoutGraph(
  nodes: { id: string }[],
  edges: { source: string; target: string }[],
  opts = { nodeW: 210, nodeH: 84, gapX: 40, gapY: 90, maxPerRow: 6 },
): Positioned[] {
  const ids = nodes.map((n) => n.id);
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));
  const linked = new Set<string>();
  for (const e of edges) {
    if (!adj.has(e.source) || !adj.has(e.target) || e.source === e.target) continue;
    adj.get(e.source)!.push(e.target);
    linked.add(e.source).add(e.target);
  }

  // Remove back edges via DFS to make a DAG.
  const state = new Map<string, 0 | 1 | 2>();
  const dag = new Map<string, string[]>(ids.map((id) => [id, []]));
  const dfs = (u: string) => {
    state.set(u, 1);
    for (const v of adj.get(u)!) {
      const s = state.get(v) ?? 0;
      if (s === 1) continue; // back edge → drop for layout purposes
      dag.get(u)!.push(v);
      if (s === 0) dfs(v);
    }
    state.set(u, 2);
  };
  for (const id of ids) if (!state.get(id)) dfs(id);

  const rank = new Map<string, number>();
  const visit = (u: string): number => {
    if (rank.has(u)) return rank.get(u)!;
    rank.set(u, 0);
    let r = 0;
    for (const [p, children] of dag) if (children.includes(u)) r = Math.max(r, visit(p) + 1);
    rank.set(u, r);
    return r;
  };
  for (const id of ids) if (linked.has(id)) visit(id);

  const layers: string[][] = [];
  for (const id of ids) {
    if (!linked.has(id)) continue;
    const r = rank.get(id)!;
    (layers[r] ??= []).push(id);
  }

  // Split overly wide layers into rows so the diagram stays readable.
  const rows: string[][] = [];
  for (const layer of layers.filter(Boolean)) {
    for (let i = 0; i < layer.length; i += opts.maxPerRow) rows.push(layer.slice(i, i + opts.maxPerRow));
  }
  const isolated = ids.filter((id) => !linked.has(id));
  for (let i = 0; i < isolated.length; i += opts.maxPerRow) rows.push(isolated.slice(i, i + opts.maxPerRow));

  const widest = Math.max(1, ...rows.map((r) => r.length));
  const totalW = widest * opts.nodeW + (widest - 1) * opts.gapX;
  const out: Positioned[] = [];
  rows.forEach((row, ri) => {
    const rowW = row.length * opts.nodeW + (row.length - 1) * opts.gapX;
    const startX = (totalW - rowW) / 2;
    row.forEach((id, ci) => {
      out.push({ id, x: startX + ci * (opts.nodeW + opts.gapX), y: ri * (opts.nodeH + opts.gapY) });
    });
  });
  return out;
}
