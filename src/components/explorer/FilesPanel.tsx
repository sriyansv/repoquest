"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { languageOf, isProbablyBinary } from "@/lib/analysis/languages";
import { ancestors, buildTree, formatBytes, searchPaths, type DirNode } from "@/lib/filetree";
import { highlight } from "@/lib/highlight";
import { githubBlobUrl } from "@/lib/github/url";
import type { RepoAnalysis } from "@/lib/types";
import { IconChevron, IconExternal, IconFile, IconFolder, IconSearch } from "../icons";
import { AIExplain } from "./AIExplain";
import { EvidenceBadge } from "./bits";
import type { AIStatus } from "./Explorer";

export function FilesPanel({
  analysis, ai, selected, onSelect,
}: { analysis: RepoAnalysis; ai: AIStatus; selected: string | null; onSelect: (p: string) => void }) {
  const tree = useMemo(() => buildTree(analysis.tree), [analysis.tree]);
  const entries = useMemo(() => new Map(analysis.entryPoints.map((e) => [e.path, e])), [analysis.entryPoints]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(selected ? ancestors(selected) : []));
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchPaths(analysis.tree, query), [analysis.tree, query]);

  // Expand to the selected file whenever it changes from outside (e.g. Overview links).
  const [lastSelected, setLastSelected] = useState(selected);
  if (selected !== lastSelected) {
    setLastSelected(selected);
    if (selected) setOpen((prev) => new Set([...prev, ...ancestors(selected)]));
  }

  const toggle = (p: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex max-h-[44vh] flex-col overflow-hidden rounded-xl border border-line bg-surface/60 lg:sticky lg:top-32 lg:max-h-[calc(100dvh-9rem)]">
        <div className="border-b border-line p-2">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-ink-2 px-2.5 py-1.5 focus-within:border-amber/50">
            <IconSearch className="text-faint" />
            <span className="sr-only">Filter files</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${analysis.totalFiles.toLocaleString("en-US")} files`}
              className="w-full bg-transparent text-sm placeholder:text-faint focus:outline-none"
            />
          </label>
        </div>
        <div className="scroll-thin flex-1 overflow-auto p-1.5 text-[13px]">
          {query ? (
            results.length ? (
              <ul>
                {results.map((p) => (
                  <li key={p}>
                    <button type="button" onClick={() => onSelect(p)} className={`flex w-full flex-col rounded-md px-2 py-1 text-left hover:bg-surface-2 ${selected === p ? "bg-amber/10" : ""}`}>
                      <span className="truncate text-fg">{p.split("/").pop()}</span>
                      <span className="truncate font-mono text-[11px] text-faint">{p}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="p-3 text-faint">No files match “{query}”.</p>
          ) : (
            <ul role="tree" aria-label="Repository files">
              <TreeLevel node={tree} depth={0} open={open} toggle={toggle} selected={selected} onSelect={onSelect} entries={entries} />
            </ul>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {selected ? (
          <FileViewer key={selected} analysis={analysis} ai={ai} path={selected} onSelect={onSelect} />
        ) : (
          <div className="grid min-h-[320px] place-items-center rounded-xl border border-dashed border-line-2 p-8 text-center">
            <div>
              <IconFile width={28} height={28} className="mx-auto text-faint" />
              <p className="mt-3 text-muted">Pick a file to preview it.</p>
              {analysis.entryPoints[0] && (
                <button type="button" onClick={() => onSelect(analysis.entryPoints[0].path)} className="mt-3 rounded-lg border border-line-2 px-3 py-1.5 font-mono text-sm text-amber-2 hover:border-amber/50">
                  Open {analysis.entryPoints[0].path}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TreeLevel = memo(function TreeLevel({
  node, depth, open, toggle, selected, onSelect, entries,
}: {
  node: DirNode; depth: number; open: Set<string>; toggle: (p: string) => void;
  selected: string | null; onSelect: (p: string) => void; entries: Map<string, { reason: string }>;
}) {
  const pad = { paddingLeft: `${depth * 14 + 6}px` };
  return (
    <>
      {node.dirs.map((d) => {
        const isOpen = open.has(d.path);
        return (
          <li key={d.path} role="treeitem" aria-expanded={isOpen} aria-selected={false}>
            <button type="button" onClick={() => toggle(d.path)} style={pad} className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-muted hover:bg-surface-2 hover:text-fg">
              <IconChevron width={12} height={12} className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              <IconFolder width={14} height={14} className="shrink-0 text-amber/80" />
              <span className="truncate">{d.name}</span>
              <span className="ml-auto font-mono text-[10.5px] text-faint">{d.fileCount}</span>
            </button>
            {isOpen && (
              <ul role="group">
                <TreeLevel node={d} depth={depth + 1} open={open} toggle={toggle} selected={selected} onSelect={onSelect} entries={entries} />
              </ul>
            )}
          </li>
        );
      })}
      {node.files.map((f) => {
        const lang = languageOf(f.path);
        const active = selected === f.path;
        return (
          <li key={f.path} role="treeitem" aria-selected={active}>
            <button
              type="button"
              onClick={() => onSelect(f.path)}
              style={{ paddingLeft: `${depth * 14 + 24}px` }}
              aria-current={active ? "true" : undefined}
              className={`flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left ${active ? "bg-amber/10 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: lang?.color ?? "#3a414d" }} />
              <span className="truncate">{f.name}</span>
              {entries.has(f.path) && <span className="ml-auto shrink-0 rounded bg-amber/15 px-1 text-[10px] text-amber" title={entries.get(f.path)!.reason}>entry</span>}
            </button>
          </li>
        );
      })}
    </>
  );
});

type Load = { state: "loading" } | { state: "ok"; content: string } | { state: "empty"; reason: string } | { state: "error"; message: string };

function FileViewer({ analysis, ai, path, onSelect }: { analysis: RepoAnalysis; ai: AIStatus; path: string; onSelect: (p: string) => void }) {
  const { meta } = analysis;
  const entry = analysis.tree.find((e) => e.path === path);
  const binary = isProbablyBinary(path);
  const [load, setLoad] = useState<Load>(binary ? { state: "empty", reason: "Binary files (images, archives, fonts…) can't be previewed here." } : { state: "loading" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (binary) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ owner: meta.owner, repo: meta.repo, path });
    fetch(`/api/file?${qs}`, { signal: ctrl.signal })
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { content?: string | null; reason?: string; error?: string };
        if (!r.ok) throw new Error(data.error ?? `Failed to load (${r.status})`);
        setLoad(data.content != null ? { state: "ok", content: data.content } : { state: "empty", reason: data.reason ?? "Preview unavailable." });
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setLoad({ state: "error", message: (e as Error).message });
      });
    return () => ctrl.abort();
  }, [binary, meta.owner, meta.repo, path]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const imports = analysis.graph.fileDependencies.filter((d) => d.from === path);
  const importedBy = analysis.graph.fileDependencies.filter((d) => d.to === path);
  const ep = analysis.entryPoints.find((e) => e.path === path);
  const parts = path.split("/");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface/60">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3">
          <h2 ref={headingRef} tabIndex={-1} className="min-w-0 flex-1 font-mono text-sm focus:outline-none">
            <span className="text-faint">{parts.slice(0, -1).join("/")}{parts.length > 1 ? "/" : ""}</span>
            <span className="text-fg">{parts.at(-1)}</span>
          </h2>
          <span className="text-xs text-faint">{languageOf(path)?.name ?? "File"} · {formatBytes(entry?.size)}</span>
          <a href={githubBlobUrl(meta.owner, meta.repo, analysis.ref, path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
            GitHub <IconExternal width={12} height={12} />
          </a>
        </div>
        {(ep || imports.length > 0 || importedBy.length > 0) && (
          <div className="space-y-2 border-b border-line px-4 py-3 text-sm">
            {ep && <p className="flex items-center gap-2 text-muted"><EvidenceBadge kind={ep.evidence} /> Entry point — {ep.reason}</p>}
            {imports.length > 0 && <DepRow label="Uses" paths={imports.map((d) => d.to)} onSelect={onSelect} />}
            {importedBy.length > 0 && <DepRow label="Used by" paths={importedBy.map((d) => d.from)} onSelect={onSelect} />}
          </div>
        )}
        <div className="px-4 py-3">
          <AIExplain owner={meta.owner} repo={meta.repo} path={path} ai={ai} onPath={(p) => analysis.tree.some((e) => e.path === p) && onSelect(p)} label="Explain this file with AI" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-ink-2">
        {load.state === "loading" && (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 10 }, (_, i) => <div key={i} className="h-3.5 animate-pulse rounded bg-surface" style={{ width: `${30 + ((i * 37) % 60)}%` }} />)}
            <span className="sr-only">Loading file…</span>
          </div>
        )}
        {load.state === "empty" && <p className="p-6 text-sm text-faint">{load.reason}</p>}
        {load.state === "error" && <p role="alert" className="p-6 text-sm text-rose">{load.message}</p>}
        {load.state === "ok" && <Code path={path} content={load.content} />}
      </div>
    </div>
  );
}

function DepRow({ label, paths, onSelect }: { label: string; paths: string[]; onSelect: (p: string) => void }) {
  return (
    <p className="flex flex-wrap items-center gap-1.5">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-faint">{label}</span>
      {paths.slice(0, 12).map((p) => (
        <button key={p} type="button" onClick={() => onSelect(p)} title={p} className="rounded border border-line bg-ink-2 px-1.5 py-px font-mono text-xs text-muted hover:border-teal/50 hover:text-teal">
          {p.split("/").pop()}
        </button>
      ))}
      {paths.length > 12 && <span className="text-xs text-faint">+{paths.length - 12} more</span>}
    </p>
  );
}

const MAX_LINES = 4000;

function Code({ path, content }: { path: string; content: string }) {
  const tokens = useMemo(() => highlight(path, content), [path, content]);
  const raw = useMemo(() => content.split("\n"), [content]);
  const total = raw.length;
  const shown = Math.min(total, MAX_LINES);
  return (
    <div className="scroll-thin max-h-[70vh] overflow-auto">
      <table className="w-full border-collapse font-mono text-[12.5px] leading-[1.6]">
        <tbody>
          {Array.from({ length: shown }, (_, i) => (
            <tr key={i} className="hover:bg-surface/60">
              <td className="select-none border-r border-line/60 px-3 text-right align-top text-faint/70" aria-hidden="true">{i + 1}</td>
              <td className="whitespace-pre px-4 text-fg/90">
                {tokens?.[i] ? tokens[i].map((t, j) => (t.t === "p" ? t.v : <span key={j} className={`tok-${t.t}`}>{t.v}</span>)) : raw[i] || " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > shown && <p className="border-t border-line p-3 text-center text-xs text-faint">Showing the first {shown.toLocaleString("en-US")} of {total.toLocaleString("en-US")} lines. Open on GitHub to see the rest.</p>}
    </div>
  );
}
