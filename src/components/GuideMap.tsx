"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ArchitectureGraph } from "@/lib/types";

const ArchitectureCanvas = dynamic(() => import("./explorer/ArchitectureCanvas").then((m) => m.ArchitectureCanvas), {
  ssr: false,
  loading: () => <div className="grid h-[460px] place-items-center text-sm text-faint">Drawing the map…</div>,
});

export function GuideMap({ graph }: { graph: ArchitectureGraph }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!graph.nodes.length) return <p className="p-6 text-sm text-faint">No modules to show.</p>;
  return <ArchitectureCanvas graph={graph} showInferred selected={selected} onSelect={setSelected} height="460px" />;
}
