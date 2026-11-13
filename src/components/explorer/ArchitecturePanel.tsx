"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { RELATION_VERB } from "@/lib/analysis/graph";
import { moduleOf } from "@/lib/analysis/structure";
import type { RepoAnalysis } from "@/lib/types";
import { EvidenceBadge } from "./bits";

const ArchitectureCanvas = dynamic(() => import("./ArchitectureCanvas").then((m) => m.ArchitectureCanvas), {
  ssr: false,
  loading: () => <div className="grid h-[70vh] place-items-center text-sm text-faint">Drawing the map…</div>,
});

export function ArchitecturePanel({ analysis, onOpenFile }: { analysis: RepoAnalysis; onOpenFile: (p: string) => void }) {
  const { graph } = analysis;
  const [showInferred, setShowInferred] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const confirmed = graph.edges.filter((e) => e.kind === "confirmed").length;
  const inferred = graph.edges.length - confirmed;

  const node = graph.nodes.find((n) => n.id === selected) ?? null;
  const details = useMemo(() => {
    if (!selected) return null;
    const files = analysis.tree.filter((e) => e.type === "blob" && moduleOf(e.path) === selected).map((e) => e.path);
    const out = graph.edges.filter((e) => e.source === selected && (showInferred || e.kind === "confirmed"));
    const inc = graph.edges.filter((e) => e.target === selected && (showInferred || e.kind === "confirmed"));
    const fileDeps = graph.fileDependencies.filter((d) => moduleOf(d.from) === selected && moduleOf(d.to) !== selected);
    return { files, out, inc, fileDeps };
  }, [selected, analysis.tree, graph, showInferred]);

  if (!graph.nodes.length) {
    return <p className="rounded-xl border border-dashed border-line-2 p-8 text-center text-muted">This repository has no files to map.</p>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-xl border border-line bg-ink-2/80">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-4 py-2.5 text-xs text-muted">
          <span className="flex items-center gap-2"><span className="h-0.5 w-6 rounded bg-teal" /> Confirmed by imports ({confirmed})</span>
          <span className="flex items-center gap-2"><span className="h-0 w-6 border-t-2 border-dashed border-violet" /> Inferred from naming ({inferred})</span>
          <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-amber" /> Has an entry point</span>
          <label className="ml-auto flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showInferred} onChange={(e) => setShowInferred(e.target.checked)} className="accent-[#b49cff]" />
            Show inferred
          </label>
        </div>
        <ArchitectureCanvas graph={graph} showInferred={showInferred} selected={selected} onSelect={setSelected} />
        <p className="border-t border-line px-4 py-2 text-xs text-faint">
          Built from {graph.analyzedFiles} source files we read. Drag to pan, scroll or pinch to zoom, click a box for details.
        </p>
      </div>

      <aside className="rounded-xl border border-line bg-surface/60 p-4 xl:sticky xl:top-32 xl:max-h-[calc(100dvh-9rem)] xl:overflow-auto scroll-thin" aria-live="polite">
        {node && details ? (
          <div className="animate-fade space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-faint">Module</p>
              <h2 className="mt-1 break-all font-mono text-lg text-fg">{node.label}</h2>
              <p className="mt-1 text-sm text-muted">
                {node.fileCount} files{node.languages.length ? ` · ${node.languages.join(", ")}` : ""}
                {node.role ? ` · likely ${node.role.toLowerCase()} (by folder name)` : ""}
              </p>
            </div>
            <Rel title="Depends on" edges={details.out} side="target" onPick={setSelected} />
            <Rel title="Used by" edges={details.inc} side="source" onPick={setSelected} />
            {details.fileDeps.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">Evidence (file → file)</h3>
                <ul className="space-y-1 text-xs">
                  {details.fileDeps.slice(0, 20).map((d) => (
                    <li key={`${d.from}-${d.to}`} className="font-mono text-muted">
                      <button type="button" className="hover:text-amber-2" onClick={() => onOpenFile(d.from)}>{d.from}</button>{" "}
                      <span className="text-faint">{RELATION_VERB[d.relation]}</span>{" "}
                      <button type="button" className="hover:text-teal" onClick={() => onOpenFile(d.to)}>{d.to}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">Files</h3>
              <ul className="space-y-0.5">
                {details.files.slice(0, 40).map((f) => (
                  <li key={f}>
                    <button type="button" onClick={() => onOpenFile(f)} className="w-full truncate rounded px-1.5 py-0.5 text-left font-mono text-xs text-muted hover:bg-surface-2 hover:text-fg">
                      {f.slice(node.path ? node.path.length + 1 : 0)}
                    </button>
                  </li>
                ))}
              </ul>
              {details.files.length > 40 && <p className="mt-1 text-xs text-faint">+{details.files.length - 40} more in the Files tab</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-muted">
            <h2 className="font-semibold text-fg">Reading the map</h2>
            <p>Each box is a folder (a <em>module</em>). An arrow from A to B means code in A uses code in B.</p>
            <p><span className="text-teal">Solid teal arrows</span> come from real <code className="font-mono text-xs">import</code>, <code className="font-mono text-xs">require</code>, <code className="font-mono text-xs">&lt;script&gt;</code> or similar statements we found. Numbers show how many.</p>
            <p><span className="text-violet">Dashed violet arrows</span> are guesses from folder names (for example, a <code className="font-mono text-xs">tests</code> folder usually tests the main code). Treat them as hints.</p>
            <p className="text-faint">Click any box to see its files and the exact statements behind each arrow.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Rel({
  title, edges, side, onPick,
}: { title: string; edges: RepoAnalysis["graph"]["edges"]; side: "source" | "target"; onPick: (id: string) => void }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">{title}</h3>
      {edges.length ? (
        <ul className="space-y-2">
          {edges.map((e) => (
            <li key={e.id} className="rounded-lg border border-line bg-ink-2/60 p-2">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => onPick(e[side])} className="truncate font-mono text-[13px] text-fg hover:text-amber-2">{e[side] === "(root)" ? "root files" : e[side]}</button>
                <EvidenceBadge kind={e.kind} />
              </div>
              <p className="mt-1 text-xs text-faint">{e.kind === "confirmed" ? `${e.weight} statement${e.weight === 1 ? "" : "s"}` : e.evidence[0]}</p>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-faint">Nothing found.</p>}
    </div>
  );
}
