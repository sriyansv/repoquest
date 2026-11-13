"use client";

import Link from "next/link";

export default function RepoRouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-xl flex-1 px-4 py-24 text-center">
      <h1 className="font-display text-4xl">Something broke while mapping this repository</h1>
      <p className="mt-4 text-muted">This is a bug in RepoQuest, not in the repository. Please try again.</p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={reset} className="rounded-lg bg-amber px-4 py-2 font-medium text-ink hover:bg-amber-2">Try again</button>
        <Link href="/" className="rounded-lg border border-line-2 px-4 py-2 hover:bg-surface">Home</Link>
      </div>
    </main>
  );
}
