"use client";

import {
  Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow,
  type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { memo, useMemo } from "react";
import { layoutGraph } from "@/lib/analysis/graph";
import type { ArchitectureGraph, ModuleNode } from "@/lib/types";

type ModuleData = Record<string, unknown> & ModuleNode & { selected: boolean; dim: boolean };

const ModuleCard = memo(function ModuleCard({ data }: NodeProps<Node<ModuleData>>) {
  return (
    <div
      className={`w-[210px] rounded-xl border bg-surface px-3 py-2.5 text-left shadow-lg shadow-black/30 transition ${
        data.selected ? "border-amber ring-2 ring-amber/25" : data.isEntry ? "border-amber/45" : "border-line-2"
      } ${data.dim ? "opacity-35" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-line-2" />
      <div className="flex items-center gap-1.5">
        {data.isEntry && <span className="size-1.5 shrink-0 rounded-full bg-amber" title="Contains an entry point" />}
        <span className="truncate font-mono text-[13px] text-fg">{data.label}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-faint">
        <span className="truncate">{data.role ?? data.languages.join(", ") ?? ""}</span>
        <span className="shrink-0 font-mono">{data.fileCount} files</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-line-2" />
    </div>
  );
});

const nodeTypes = { module: ModuleCard };

export function ArchitectureCanvas({
  graph, showInferred, selected, onSelect, height = "70vh", interactive = true,
}: {
  graph: ArchitectureGraph;
  showInferred: boolean;
  selected: string | null;
  onSelect: (id: string | null) => void;
  height?: string;
  interactive?: boolean;
}) {
  const edges0 = useMemo(() => graph.edges.filter((e) => showInferred || e.kind === "confirmed"), [graph.edges, showInferred]);
  const positions = useMemo(() => new Map(layoutGraph(graph.nodes, edges0).map((p) => [p.id, p])), [graph.nodes, edges0]);

  const neighbors = useMemo(() => {
    if (!selected) return null;
    const s = new Set([selected]);
    for (const e of edges0) {
      if (e.source === selected) s.add(e.target);
      if (e.target === selected) s.add(e.source);
    }
    return s;
  }, [selected, edges0]);

  const nodes: Node<ModuleData>[] = useMemo(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        type: "module",
        position: { x: positions.get(n.id)?.x ?? 0, y: positions.get(n.id)?.y ?? 0 },
        data: { ...n, selected: n.id === selected, dim: Boolean(neighbors && !neighbors.has(n.id)) },
        draggable: interactive,
        ariaLabel: `${n.label}, ${n.fileCount} files${n.role ? `, ${n.role}` : ""}`,
      })),
    [graph.nodes, positions, selected, neighbors, interactive],
  );

  const edges: Edge[] = useMemo(
    () =>
      edges0.map((e) => {
        const confirmed = e.kind === "confirmed";
        const active = !selected || e.source === selected || e.target === selected;
        const color = confirmed ? "#5fd4c4" : "#b49cff";
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          animated: confirmed && Boolean(selected) && active,
          label: confirmed && e.weight > 1 ? String(e.weight) : undefined,
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
          style: {
            stroke: color,
            strokeWidth: confirmed ? Math.min(1.2 + Math.log2(e.weight + 1) * 0.6, 3.2) : 1.4,
            strokeDasharray: confirmed ? undefined : "5 5",
            opacity: active ? 0.9 : 0.12,
          },
        };
      }),
    [edges0, selected],
  );

  return (
    <div style={{ height }} className="w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
        minZoom={0.15}
        maxZoom={2}
        onNodeClick={(_, n) => onSelect(n.id === selected ? null : n.id)}
        onPaneClick={() => onSelect(null)}
        nodesConnectable={false}
        elementsSelectable={interactive}
        panOnDrag={interactive}
        zoomOnScroll={interactive}
        proOptions={{ hideAttribution: false }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#252b34" />
        {interactive && <Controls showInteractive={false} position="bottom-left" />}
        {interactive && graph.nodes.length > 8 && (
          <MiniMap pannable zoomable nodeColor={(n) => ((n.data as unknown as ModuleData).isEntry ? "#f4b860" : "#313946")} maskColor="rgba(10,12,15,0.7)" className="!hidden sm:!block" />
        )}
      </ReactFlow>
    </div>
  );
}
