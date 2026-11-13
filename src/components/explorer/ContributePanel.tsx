"use client";

import { useState } from "react";
import type { IssueAssessment, RepoAnalysis } from "@/lib/types";
import { IconCheck, IconExternal, IconFlag } from "../icons";
import { Card, EvidenceBadge, InlineCode } from "./bits";

const VERDICT = {
  "good-first": { label: "Good first issue", cls: "border-teal/40 bg-teal/10 text-teal" },
  possible: { label: "Possible, check first", cls: "border-amber/40 bg-amber/10 text-amber" },
  "not-recommended": { label: "Not for a first PR", cls: "border-line-2 bg-surface-2 text-faint" },
} as const;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function ago(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (Math.abs(days) < 1) return "today";
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), "month");
  return rtf.format(Math.round(days / 365), "year");
}

export function ContributePanel({ analysis, onOpenFile }: { analysis: RepoAnalysis; onOpenFile: (p: string) => void }) {
  const { issues, meta } = analysis;
  const [filter, setFilter] = useState<"all" | "good-first">("all");
  const list = filter === "all" ? issues : issues.filter((i) => i.verdict === filter);
  const good = issues.filter((i) => i.verdict === "good-first").length;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl tracking-tight">Find your first issue</h2>
            <p className="mt-1 text-sm text-muted">
              We read each open issue&apos;s labels <em>and</em> its description, assignees and activity. A label alone is never enough.
            </p>
          </div>
          {issues.length > 0 && (
            <div className="flex rounded-lg border border-line bg-surface p-0.5 text-sm" role="group" aria-label="Filter issues">
              {(["all", "good-first"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 ${filter === f ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}>
                  {f === "all" ? `All (${issues.length})` : `Good first (${good})`}
                </button>
              ))}
            </div>
          )}
        </div>

        {analysis.issuesError && <p role="alert" className="rounded-lg border border-rose/30 bg-rose/5 p-3 text-sm text-rose">Couldn&apos;t load issues: {analysis.issuesError}</p>}
        {meta.archived && <p className="rounded-lg border border-rose/30 bg-rose/5 p-3 text-sm text-rose">This repository is archived, so it won&apos;t accept new contributions.</p>}

        {!analysis.issuesError && list.length === 0 && (
          <div className="rounded-xl border border-dashed border-line-2 p-8 text-center">
            <IconFlag width={24} height={24} className="mx-auto text-faint" />
            <p className="mt-3 text-muted">{issues.length ? "No issues passed our beginner-friendly checks." : "This repository has no open issues right now."}</p>
            <p className="mt-1 text-sm text-faint">Improving documentation or fixing typos you notice while reading is still a great first contribution.</p>
          </div>
        )}

        <ul className="space-y-3">
          {list.map((issue) => <IssueCard key={issue.number} issue={issue} onOpenFile={onOpenFile} />)}
        </ul>
      </div>

      <aside className="space-y-5">
        <Card title="Before your first pull request">
          <ol className="space-y-3 text-sm text-muted">
            <Step n={1}>Read the <strong className="text-fg">Overview</strong> and open the entry points to see how the project starts.</Step>
            <Step n={2}>
              {analysis.contributingPath ? (
                <>Read <button type="button" className="font-mono text-amber-2 hover:underline" onClick={() => onOpenFile(analysis.contributingPath!)}>{analysis.contributingPath}</button>. It has the maintainers&apos; rules.</>
              ) : (
                <>This project has no CONTRIBUTING guide, so check the README and recent pull requests for conventions.</>
              )}
            </Step>
            <Step n={3}>Get the project running locally. The setup commands are on the Overview tab.</Step>
            <Step n={4}>Comment on the issue before you start, so nobody duplicates work.</Step>
            <Step n={5}>Keep the change small, and explain what you tested in the pull request.</Step>
          </ol>
        </Card>
        <p className="px-1 text-xs text-faint">
          Analysed {issues.length} open issue{issues.length === 1 ? "" : "s"} (recently updated, plus those labelled “good first issue”). We can&apos;t see linked pull requests, so check the issue for one before starting.
        </p>
      </aside>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line-2 font-mono text-[11px] text-amber">{n}</span>
      <span>{children}</span>
    </li>
  );
}

function IssueCard({ issue, onOpenFile }: { issue: IssueAssessment; onOpenFile: (p: string) => void }) {
  const [open, setOpen] = useState(issue.verdict === "good-first");
  const v = VERDICT[issue.verdict];
  return (
    <li className="rounded-xl border border-line bg-surface/60">
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <a href={issue.url} target="_blank" rel="noreferrer" className="group min-w-0 flex-1">
            <h3 className="font-medium leading-snug text-fg group-hover:text-amber-2">
              {issue.title} <span className="font-mono text-sm font-normal text-faint">#{issue.number}</span>
              <IconExternal width={13} height={13} className="ml-1 inline text-faint" />
            </h3>
          </a>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${v.cls}`}>{v.label}</span>
        </div>
        <p className="mt-1 text-xs text-faint">
          {issue.author ? `opened by ${issue.author} · ` : ""}updated {ago(issue.updatedAt)} · {issue.comments} comment{issue.comments === 1 ? "" : "s"}
        </p>
        {issue.labels.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1">
            {issue.labels.slice(0, 6).map((l) => <li key={l} className="rounded-full border border-line-2 px-2 py-px text-[11px] text-muted">{l}</li>)}
          </ul>
        )}
        {issue.bodyExcerpt && <p className="mt-3 text-sm leading-relaxed text-muted">{issue.bodyExcerpt}</p>}
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-3 text-xs text-amber hover:underline">
          {open ? "Hide assessment" : "Why this rating, and where to look"}
        </button>
      </div>
      {open && (
        <div className="grid gap-4 border-t border-line p-4 text-sm md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">What we checked</h4>
            <ul className="space-y-1.5">
              {issue.reasons.map((r) => (
                <li key={r.text} className="flex gap-2 text-muted">
                  <span className={r.positive ? "text-teal" : "text-rose"} aria-label={r.positive ? "positive" : "concern"}>{r.positive ? <IconCheck width={14} height={14} /> : "–"}</span>
                  {r.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">Possibly relevant files</h4>
              {issue.relevantFiles.length ? (
                <ul className="space-y-1">
                  {issue.relevantFiles.map((f) => (
                    <li key={f.path} className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => onOpenFile(f.path)} className="truncate font-mono text-xs text-amber-2 hover:underline">{f.path}</button>
                      <EvidenceBadge kind={f.evidence} />
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-faint">The issue doesn&apos;t point to specific files.</p>}
            </div>
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">Understand first</h4>
              <ul className="list-disc space-y-1 pl-4 text-muted marker:text-faint">
                {issue.prerequisites.map((p) => <li key={p}><InlineCode text={p} /></li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
