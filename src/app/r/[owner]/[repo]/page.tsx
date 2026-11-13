import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Explorer } from "@/components/explorer/Explorer";
import { RepoHeader } from "@/components/explorer/RepoHeader";
import { RepoError } from "@/components/RepoError";
import { RepoSearch } from "@/components/RepoSearch";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { aiStatus } from "@/lib/ai/provider";
import { GitHubError } from "@/lib/github/client";
import { analyzeRepoForRequest } from "@/lib/github/guard";
import { isValidOwner, isValidRepoName } from "@/lib/github/url";
import type { RepoAnalysis } from "@/lib/types";

type Params = { owner: string; repo: string };

export const revalidate = 1800;
// Large repositories need ~90 fetches on a cold cache.
export const maxDuration = 60;

function decode(params: Params): Params {
  try {
    return { owner: decodeURIComponent(params.owner), repo: decodeURIComponent(params.repo) };
  } catch {
    return { owner: "", repo: "" };
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { owner, repo } = decode(await params);
  if (!isValidOwner(owner) || !isValidRepoName(repo)) return { title: "Repository not found" };
  try {
    const a = await analyzeRepoForRequest(owner, repo);
    const description = `Explore ${a.meta.fullName}: ${a.summary.headline}`.slice(0, 200);
    return {
      title: `${a.meta.fullName} explorer`,
      description,
      alternates: { canonical: `/r/${a.meta.owner}/${a.meta.repo}` },
      openGraph: { title: `${a.meta.fullName} · RepoQuest`, description },
      twitter: { card: "summary_large_image", title: `${a.meta.fullName} · RepoQuest`, description },
    };
  } catch {
    return { title: `${owner}/${repo}`, robots: { index: false } };
  }
}

export default async function RepoPage({ params }: { params: Promise<Params> }) {
  const { owner, repo } = decode(await params);
  if (!isValidOwner(owner) || !isValidRepoName(repo)) notFound();

  let analysis: RepoAnalysis | null = null;
  let error: GitHubError | null = null;
  try {
    analysis = await analyzeRepoForRequest(owner, repo);
  } catch (err) {
    if (err instanceof GitHubError) error = err;
    else throw err;
  }

  return (
    <>
      <SiteHeader>
        <div className="hidden max-w-md md:block">
          <RepoSearch size="sm" label="Explore a different repository" />
        </div>
      </SiteHeader>
      <main id="main" className="flex-1">
        {analysis ? (
          <>
            <RepoHeader analysis={analysis} />
            <Explorer analysis={analysis} ai={aiStatus()} />
          </>
        ) : (
          <RepoError owner={owner} repo={repo} kind={error!.kind} message={error!.message} resetAt={error!.resetAt} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
