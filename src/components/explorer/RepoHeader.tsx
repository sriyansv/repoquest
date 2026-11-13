import Image from "next/image";
import Link from "next/link";
import type { RepoAnalysis } from "@/lib/types";
import { IconExternal, IconFork, IconStar } from "../icons";
import { ShareButton } from "./ShareButton";

const nf = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function RepoHeader({ analysis }: { analysis: RepoAnalysis }) {
  const { meta } = analysis;
  return (
    <div className="relative overflow-hidden border-b border-line/70">
      <div className="bg-topo pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 animate-rise">
            <p className="flex items-center gap-2 text-sm text-muted">
              {meta.ownerAvatar && (
                <Image src={meta.ownerAvatar} alt="" width={20} height={20} className="rounded-full ring-1 ring-line-2" />
              )}
              <a href={`https://github.com/${meta.owner}`} className="hover:text-fg" target="_blank" rel="noreferrer">{meta.owner}</a>
              {meta.archived && <span className="rounded-full border border-rose/40 px-2 py-0.5 text-xs text-rose">Archived</span>}
              {meta.fork && <span className="rounded-full border border-line-2 px-2 py-0.5 text-xs">Fork</span>}
            </p>
            <h1 className="mt-1.5 break-words font-display text-4xl leading-tight tracking-tight sm:text-5xl">{meta.repo}</h1>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{analysis.summary.headline}</p>
            <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted" aria-label="Repository stats">
              <li className="flex items-center gap-1.5"><IconStar className="text-amber" /><span className="sr-only">Stars:</span>{nf.format(meta.stars)}</li>
              <li className="flex items-center gap-1.5"><IconFork /><span className="sr-only">Forks:</span>{nf.format(meta.forks)}</li>
              {analysis.languages[0] && (
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: analysis.languages[0].color }} aria-hidden="true" />
                  <span className="sr-only">Main language:</span>{analysis.languages[0].language}
                </li>
              )}
              <li>{analysis.totalFiles.toLocaleString("en-US")} files</li>
              {meta.license && <li><span className="sr-only">License:</span>{meta.license}</li>}
            </ul>
          </div>
          <div className="no-print flex shrink-0 flex-wrap gap-2">
            <ShareButton path={`/r/${meta.owner}/${meta.repo}/guide`} />
            <Link
              href={`/r/${meta.owner}/${meta.repo}/guide`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm hover:border-amber/50"
            >
              Guide page
            </Link>
            <a
              href={meta.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm hover:border-amber/50"
            >
              GitHub <IconExternal width={14} height={14} />
            </a>
          </div>
        </div>
        {analysis.notices.length > 0 && (
          <ul className="mt-5 space-y-1 text-sm text-amber-2/90">
            {analysis.notices.map((n) => <li key={n}>· {n}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
