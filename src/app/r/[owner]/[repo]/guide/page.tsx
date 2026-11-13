import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideMap } from "@/components/GuideMap";
import { RepoError } from "@/components/RepoError";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { InlineCode, SourceChip } from "@/components/explorer/bits";
import { ShareButton } from "@/components/explorer/ShareButton";
import { GitHubError } from "@/lib/github/client";
import { analyzeRepoForRequest } from "@/lib/github/guard";
import { githubBlobUrl, isValidOwner, isValidRepoName } from "@/lib/github/url";
import type { RepoAnalysis } from "@/lib/types";

type Params = { owner: string; repo: string };
export const revalidate = 1800;
// Large repositories need ~90 fetches on a cold cache.
export const maxDuration = 60;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { owner, repo } = await params;
  if (!isValidOwner(owner) || !isValidRepoName(repo)) return { title: "Not found" };
  try {
    const a = await analyzeRepoForRequest(owner, repo);
    const description = `A beginner's guide to ${a.meta.fullName}: ${a.summary.headline}`.slice(0, 200);
    return {
      title: `${a.meta.fullName}: a newcomer's guide`,
      description,
      alternates: { canonical: `/r/${a.meta.owner}/${a.meta.repo}/guide` },
      openGraph: { type: "article", title: `${a.meta.fullName}: a newcomer's guide`, description },
      twitter: { card: "summary_large_image", title: `${a.meta.fullName} · RepoQuest guide`, description },
    };
  } catch {
    return { title: `${owner}/${repo}`, robots: { index: false } };
  }
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { owner, repo } = await params;
  if (!isValidOwner(owner) || !isValidRepoName(repo)) notFound();
  let a: RepoAnalysis;
  try {
    a = await analyzeRepoForRequest(owner, repo);
  } catch (err) {
    if (!(err instanceof GitHubError)) throw err;
    return (
      <>
        <SiteHeader />
        <main id="main" className="flex-1"><RepoError owner={owner} repo={repo} kind={err.kind} message={err.message} resetAt={err.resetAt} /></main>
      </>
    );
  }

  const explorer = `/r/${a.meta.owner}/${a.meta.repo}`;
  const good = a.issues.filter((i) => i.verdict === "good-first").slice(0, 4);
  const sourceHref = (s: string) => (a.tree.some((e) => e.path === s) ? `${explorer}?tab=files&path=${encodeURIComponent(s)}` : null);
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <header className="border-b border-line pb-8">
            <p className="font-mono text-xs uppercase tracking-widest text-amber">Newcomer&apos;s guide</p>
            <h1 className="mt-2 break-words font-display text-5xl tracking-tight sm:text-6xl">{a.meta.fullName}</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">{a.summary.headline}</p>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-faint">
              <span>★ {a.meta.stars.toLocaleString("en-US")}</span>
              {a.languages[0] && <span>{a.languages.slice(0, 3).map((l) => l.language).join(" · ")}</span>}
              <span>{a.totalFiles.toLocaleString("en-US")} files</span>
              {a.meta.license && <span>{a.meta.license}</span>}
              <span>Generated {new Date(a.generatedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
            </p>
            <div className="no-print mt-6 flex flex-wrap gap-2">
              <ShareButton path={`${explorer}/guide`} label="Copy link" />
              <Link href={explorer} className="rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm hover:border-amber/50">Open interactive explorer</Link>
              <a href={a.meta.htmlUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm hover:border-amber/50">View on GitHub</a>
            </div>
          </header>

          <section className="mt-10" aria-labelledby="g-what">
            <h2 id="g-what" className="font-display text-3xl">What it does</h2>
            <div className="mt-4">{a.summary.whatItDoes.length ? <Facts sourceHref={sourceHref} items={a.summary.whatItDoes} /> : <p className="text-muted">No description or README introduction was found.</p>}</div>
          </section>

          <section className="mt-12" aria-labelledby="g-map">
            <h2 id="g-map" className="font-display text-3xl">Architecture</h2>
            <p className="mt-2 text-sm text-muted">Solid arrows are confirmed by import statements; dashed arrows are inferred from folder names.</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-line bg-ink-2">
              <GuideMap graph={a.graph} />
            </div>
          </section>

          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <section aria-labelledby="g-start">
              <h2 id="g-start" className="font-display text-3xl">Start reading here</h2>
              <ul className="mt-4 space-y-2">
                {a.entryPoints.slice(0, 6).map((e) => (
                  <li key={e.path}>
                    <a href={githubBlobUrl(a.meta.owner, a.meta.repo, a.ref, e.path)} target="_blank" rel="noreferrer" className="font-mono text-sm text-amber-2 hover:underline">{e.path}</a>
                    <span className="block text-xs text-faint">{e.reason}{e.evidence === "convention" ? " (by naming convention)" : ""}</span>
                  </li>
                ))}
                {!a.entryPoints.length && <li className="text-sm text-faint">No entry point detected.</li>}
              </ul>
            </section>
            <section aria-labelledby="g-run">
              <h2 id="g-run" className="font-display text-3xl">Run it locally</h2>
              <div className="mt-4">{a.summary.howToRun.length ? <Facts sourceHref={sourceHref} items={a.summary.howToRun} /> : <p className="text-sm text-faint">No setup steps found.</p>}</div>
            </section>
          </div>

          <section className="mt-12" aria-labelledby="g-org">
            <h2 id="g-org" className="font-display text-3xl">How it&apos;s organized</h2>
            <div className="mt-4"><Facts sourceHref={sourceHref} items={a.summary.structure} /></div>
          </section>

          {a.summary.executionFlow.length > 0 && (
            <section className="mt-12" aria-labelledby="g-flow">
              <h2 id="g-flow" className="font-display text-3xl">How execution flows</h2>
              <ol className="mt-4 space-y-1.5 font-mono text-sm">
                {a.summary.executionFlow.map((s, i) => (
                  <li key={i} style={{ paddingLeft: `${s.depth * 20}px` }} className="text-muted">
                    <span className="text-amber-2">{s.file}</span> <span className="text-faint">→</span> {s.calls.join(", ")}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="mt-12" aria-labelledby="g-issues">
            <h2 id="g-issues" className="font-display text-3xl">Good first issues</h2>
            {good.length ? (
              <ul className="mt-4 space-y-3">
                {good.map((i) => (
                  <li key={i.number} className="rounded-xl border border-line bg-surface/60 p-4">
                    <a href={i.url} target="_blank" rel="noreferrer" className="font-medium hover:text-amber-2">{i.title} <span className="font-mono text-sm text-faint">#{i.number}</span></a>
                    <p className="mt-1 text-sm text-muted">{i.reasons.filter((r) => r.positive).map((r) => r.text).join(" ")}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-muted">No open issue currently passes our beginner-friendly checks. <Link href={`${explorer}?tab=contribute`} className="text-amber underline decoration-amber/40 underline-offset-2">See all assessed issues</Link>.</p>
            )}
          </section>

          {a.summary.caveats.length > 0 && (
            <footer className="mt-12 border-t border-line pt-6 text-sm text-faint">
              <p className="font-medium text-muted">About this guide</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {a.summary.caveats.map((c) => <li key={c}>{c}</li>)}
                <li>Generated automatically by RepoQuest from public repository data.</li>
              </ul>
            </footer>
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

function Facts({ items, sourceHref }: { items: RepoAnalysis["summary"]["whatItDoes"]; sourceHref: (s: string) => string | null }) {
  return (
    <ul className="space-y-2.5 text-[15px] leading-relaxed text-muted">
      {items.map((f, i) => {
        const href = sourceHref(f.source);
        return (
          <li key={i} className="flex gap-2.5">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-amber/70" aria-hidden="true" />
            <span>
              <InlineCode text={f.text} />
              {href ? <Link href={href} className="ml-1.5 font-mono text-[11px] text-faint hover:text-amber">[{f.source}]</Link> : <SourceChip source={f.source} />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
