"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RepoAnalysis } from "@/lib/types";
import { IconCompass, IconFlag, IconFolder, IconGraph } from "../icons";
import { ArchitecturePanel } from "./ArchitecturePanel";
import { ContributePanel } from "./ContributePanel";
import { FilesPanel } from "./FilesPanel";
import { OverviewPanel } from "./OverviewPanel";

export type Tab = "overview" | "files" | "architecture" | "contribute";
const TABS: { id: Tab; label: string; icon: typeof IconCompass }[] = [
  { id: "overview", label: "Overview", icon: IconCompass },
  { id: "files", label: "Files", icon: IconFolder },
  { id: "architecture", label: "Architecture", icon: IconGraph },
  { id: "contribute", label: "First contribution", icon: IconFlag },
];

export interface AIStatus {
  enabled: boolean;
  provider: string | null;
}

export function Explorer({ analysis, ai }: { analysis: RepoAnalysis; ai: AIStatus }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [file, setFile] = useState<string | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Deep links: ?tab=files&path=src/index.ts
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tab") as Tab | null;
    const p = sp.get("path");
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from the URL after hydration */
    if (t && TABS.some((x) => x.id === t)) setTab(t);
    if (p && analysis.tree.some((e) => e.path === p && e.type === "blob")) {
      setFile(p);
      if (!t) setTab("files");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [analysis.tree]);

  const syncUrl = useCallback((t: Tab, p: string | null) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    if (p && t === "files") url.searchParams.set("path", p);
    else url.searchParams.delete("path");
    if (t === "overview") url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  }, []);

  const go = useCallback(
    (t: Tab, p: string | null = file) => {
      setTab(t);
      if (p !== file) setFile(p);
      syncUrl(t, p);
    },
    [file, syncUrl],
  );

  const openFile = useCallback((path: string) => go("files", path), [go]);

  function onKey(e: React.KeyboardEvent, i: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = TABS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      go(TABS[next].id);
      tabRefs.current[TABS[next].id]?.focus();
    }
  }

  const goodFirst = analysis.issues.filter((i) => i.verdict === "good-first").length;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <div
        role="tablist"
        aria-label="Repository views"
        className="no-print scroll-thin sticky top-14 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-line/70 bg-ink/85 px-4 backdrop-blur-md sm:mx-0 sm:px-0"
      >
        {TABS.map((t, i) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => go(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`relative flex shrink-0 items-center gap-2 px-3 py-3.5 text-sm transition-colors ${
                active ? "text-fg" : "text-muted hover:text-fg"
              }`}
            >
              <Icon className={active ? "text-amber" : ""} />
              {t.label}
              {t.id === "contribute" && goodFirst > 0 && (
                <span className="rounded-full bg-teal/15 px-1.5 text-xs text-teal">{goodFirst}</span>
              )}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-amber" />}
            </button>
          );
        })}
      </div>

      <div className="pt-6">
        {TABS.map((t) => (
          <div
            key={t.id}
            role="tabpanel"
            id={`panel-${t.id}`}
            aria-labelledby={`tab-${t.id}`}
            hidden={tab !== t.id}
            className="animate-fade"
          >
            {tab === t.id && t.id === "overview" && <OverviewPanel analysis={analysis} ai={ai} onOpenFile={openFile} onTab={go} />}
            {tab === t.id && t.id === "files" && (
              <FilesPanel analysis={analysis} ai={ai} selected={file} onSelect={(p) => go("files", p)} />
            )}
            {tab === t.id && t.id === "architecture" && <ArchitecturePanel analysis={analysis} onOpenFile={openFile} />}
            {tab === t.id && t.id === "contribute" && <ContributePanel analysis={analysis} onOpenFile={openFile} />}
          </div>
        ))}
      </div>
    </div>
  );
}
