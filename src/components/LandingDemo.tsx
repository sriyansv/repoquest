"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import demo from "@/data/demo.json";
import type { ArchitectureGraph } from "@/lib/types";

const ArchitectureCanvas = dynamic(() => import("./explorer/ArchitectureCanvas").then((m) => m.ArchitectureCanvas), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[420px] place-items-center text-sm text-faint">Drawing the map…</div>,
});

const graph = demo.graph as ArchitectureGraph;

export function LandingDemo() {
  const [selected, setSelected] = useState<string | null>("src/components/explorer");
  const node = graph.nodes.find((n) => n.id === selected);
  const out = graph.edges.filter((e) => e.source === selected);
  const inc = graph.edges.filter((e) => e.target === selected);

  return (
    <div className="overflow-hidden rounded-2xl border border-line-2 bg-ink-2 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
        <span className="size-2.5 rounded-full bg-[#febc2e]/80" />
        <span className="size-2.5 rounded-full bg-[#28c840]/80" />
        <span className="ml-3 truncate font-mono text-xs text-faint">repoquest · architecture · sriyansv/repoquest</span>
      </div>
      <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="h-[420px] border-line md:h-[480px] md:border-r">
          <ArchitectureCanvas graph={graph} showInferred selected={selected} onSelect={setSelected} height="100%" />
        </div>
        <div className="border-t border-line p-4 text-sm md:border-t-0" aria-live="polite">
          {node ? (
            <>
              <p className="text-xs uppercase tracking-wider text-faint">Selected module</p>
              <p className="mt-1 break-all font-mono text-fg">{node.label}</p>
              <p className="mt-1 text-xs text-faint">{node.fileCount} files · {node.languages.join(", ")}</p>
              <p className="mt-4 text-xs uppercase tracking-wider text-faint">Uses</p>
              <ul className="mt-1 space-y-1">
                {out.length ? out.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2 font-mono text-xs">
                    <span className="truncate text-teal">{e.target}</span><span className="text-faint">{e.weight}×</span>
                  </li>
                )) : <li className="text-xs text-faint">Nothing</li>}
              </ul>
              <p className="mt-4 text-xs uppercase tracking-wider text-faint">Used by</p>
              <ul className="mt-1 space-y-1">
                {inc.length ? inc.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2 font-mono text-xs">
                    <span className="truncate text-muted">{e.source}</span><span className="text-faint">{e.weight}×</span>
                  </li>
                )) : <li className="text-xs text-faint">Nothing</li>}
              </ul>
              <p className="mt-4 text-xs text-faint">Every arrow is backed by real import statements in this project&apos;s source.</p>
            </>
          ) : (
            <p className="text-faint">Click a module to see what it uses and what uses it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
