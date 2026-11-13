"use client";

import type { Fact, RepoAnalysis } from "@/lib/types";
import { IconChevron } from "../icons";
import { AIExplain } from "./AIExplain";
import { Card, EvidenceBadge, InlineCode, SourceChip } from "./bits";
import type { AIStatus, Tab } from "./Explorer";

export function OverviewPanel({
  analysis, ai, onOpenFile, onTab,
}: { analysis: RepoAnalysis; ai: AIStatus; onOpenFile: (p: string) => void; onTab: (t: Tab) => void }) {
  const { summary, meta } = analysis;
  const files = new Set(analysis.tree.map((e) => e.path));
  const openable = (src: string) => (files.has(src) ? () => onOpenFile(src) : undefined);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card title="What this repository does" aside={<span className="text-xs text-faint">Every statement links to its source</span>}>
          <FactList openable={openable} facts={summary.whatItDoes} empty="The repository has no description or README introduction, so its purpose can't be stated from the source alone." />
          <div className="mt-4">
            <AIExplain owner={meta.owner} repo={meta.repo} ai={ai} onPath={onOpenFile} label="Explain this repository with AI" />
          </div>
        </Card>

        <Card title="How it runs">
          {summary.executionFlow.length ? (
            <>
              <p className="mb-3 text-sm text-faint">Traced by following import statements outward from the entry points.</p>
              <ol className="space-y-2">
                {summary.executionFlow.map((s, i) => (
                  <li key={`${s.file}-${i}`} className="flex flex-wrap items-center gap-1.5 text-sm" style={{ paddingLeft: `${s.depth * 18}px` }}>
                    <span className="font-mono text-[11px] text-faint">{i + 1}.</span>
                    <button type="button" onClick={() => onOpenFile(s.file)} className="rounded font-mono text-amber-2 hover:underline">{s.file}</button>
                    <span className="text-faint">uses</span>
                    {s.calls.map((c) => (
                      <button key={c} type="button" onClick={() => onOpenFile(c)} className="rounded border border-line bg-ink-2 px-1.5 py-px font-mono text-xs text-muted hover:border-teal/50 hover:text-teal">
                        {c.split("/").pop()}
                      </button>
                    ))}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="text-sm text-faint">No import chain could be traced from an entry point in the files we analyzed.</p>
          )}
          {summary.howToRun.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">Run it locally</h3>
              <FactList openable={openable} facts={summary.howToRun} empty="" />
            </div>
          )}
        </Card>

        <Card title="How it's organized" aside={<button type="button" onClick={() => onTab("architecture")} className="inline-flex items-center gap-1 text-xs text-amber hover:underline">Open the map <IconChevron width={12} height={12} /></button>}>
          <FactList openable={openable} facts={summary.structure} empty="No folders found." />
        </Card>

        {summary.caveats.length > 0 && (
          <div className="rounded-xl border border-line border-dashed px-4 py-3 text-sm text-faint">
            <p className="mb-1 font-medium text-muted">Limits of this analysis</p>
            <ul className="list-disc space-y-1 pl-5">{summary.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <Card title="Start reading here">
          {analysis.entryPoints.length ? (
            <ul className="space-y-2">
              {analysis.entryPoints.slice(0, 7).map((e) => (
                <li key={e.path}>
                  <button type="button" onClick={() => onOpenFile(e.path)} className="group w-full rounded-lg border border-line bg-ink-2/60 px-3 py-2 text-left hover:border-amber/40">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[13px] text-fg group-hover:text-amber-2">{e.path}</span>
                      <EvidenceBadge kind={e.evidence} />
                    </span>
                    <span className="mt-0.5 block text-xs text-faint">{e.reason}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-faint">No entry point detected. Try the README or the largest folder.</p>
          )}
        </Card>

        <Card title="Languages">
          {analysis.languages.length ? (
            <>
              <div className="flex h-2 overflow-hidden rounded-full bg-ink-2" role="img" aria-label={analysis.languages.map((l) => `${l.language} ${l.percent}%`).join(", ")}>
                {analysis.languages.map((l) => <span key={l.language} style={{ width: `${l.percent}%`, background: l.color }} />)}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                {analysis.languages.slice(0, 8).map((l) => (
                  <li key={l.language} className="flex items-center gap-2 text-muted">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: l.color }} />
                    <span className="truncate">{l.language}</span>
                    <span className="ml-auto font-mono text-xs text-faint">{l.percent}%</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="text-sm text-faint">No source code detected.</p>}
        </Card>

        <Card title="Tech stack">
          <FactList openable={openable} facts={summary.techStack} empty="No manifest files (package.json, pyproject.toml, go.mod…) were found." />
          {analysis.graph.externalPackages.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">Most-imported packages</h3>
              <ul className="flex flex-wrap gap-1.5">
                {analysis.graph.externalPackages.slice(0, 14).map((p) => (
                  <li key={p.name} className="rounded border border-line bg-ink-2 px-1.5 py-0.5 font-mono text-[11.5px] text-muted" title={`Imported by ${p.importedBy} analyzed file(s)`}>
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {analysis.rateLimit && (
          <p className="px-1 text-xs text-faint">
            GitHub API: {analysis.rateLimit.remaining.toLocaleString("en-US")}/{analysis.rateLimit.limit.toLocaleString("en-US")} requests left
            {analysis.rateLimit.authenticated ? "" : " (anonymous)"}. Results are cached for 30 minutes.
          </p>
        )}
      </aside>
    </div>
  );
}

function FactList({ facts, empty, openable }: { facts: Fact[]; empty: string; openable: (src: string) => (() => void) | undefined }) {
  return facts.length ? (
    <ul className="space-y-2.5 text-[14.5px] leading-relaxed text-muted">
      {facts.map((f, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber/70" aria-hidden="true" />
          <span><InlineCode text={f.text} /><SourceChip source={f.source} onClick={openable(f.source)} /></span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-faint">{empty}</p>
  );
}
