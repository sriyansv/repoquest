import Link from "next/link";
import { RepoSearch } from "./RepoSearch";
import { IconAlert } from "./icons";

const TITLES: Record<string, string> = {
  not_found: "We couldn't find that repository",
  rate_limited: "GitHub needs a short breather",
  forbidden: "That repository isn't accessible",
  unavailable: "GitHub is unavailable right now",
  network: "We couldn't reach GitHub",
  invalid: "That doesn't look like a repository",
};

export function RepoError({
  owner, repo, kind, message, resetAt,
}: { owner: string; repo: string; kind: string; message: string; resetAt?: string }) {
  const resetText = resetAt ? new Date(resetAt).toUTCString().replace(/:\d\d GMT/, " UTC") : null;
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center sm:py-28" aria-labelledby="err-title">
      <div className="mx-auto mb-6 grid size-12 place-items-center rounded-full border border-line-2 bg-surface text-amber">
        <IconAlert width={22} height={22} />
      </div>
      <h1 id="err-title" className="font-display text-4xl tracking-tight">{TITLES[kind] ?? "Something went wrong"}</h1>
      <p className="mt-3 font-mono text-sm text-faint">{owner}/{repo}</p>
      <p className="mt-4 text-muted">{message}</p>
      {kind === "rate_limited" && resetText && <p className="mt-2 text-sm text-faint">The limit resets around {resetText}.</p>}
      {kind === "not_found" && (
        <p className="mt-2 text-sm text-faint">Check the spelling, and note RepoQuest only works with public repositories.</p>
      )}
      <div className="mx-auto mt-8 max-w-md text-left">
        <RepoSearch initial={`${owner}/${repo}`} />
      </div>
      <p className="mt-6 text-sm">
        <Link href="/" className="text-amber hover:underline">Back to home</Link>
      </p>
    </section>
  );
}
