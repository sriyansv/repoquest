"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { parseRepoInput, repoPath } from "@/lib/github/url";
import { IconAlert, IconSearch } from "./icons";

export function RepoSearch({ size = "lg", autoFocus = false, initial = "" }: { size?: "lg" | "sm"; autoFocus?: boolean; initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errId = useId();
  const lg = size === "lg";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseRepoInput(value);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    startTransition(() => router.push(repoPath(parsed.ref)));
  }

  return (
    // Works without JavaScript too: the form falls back to GET /go?url=...
    <form action="/go" method="get" onSubmit={submit} className="w-full" role="search" aria-label="Explore a GitHub repository">
      <div
        className={`group flex items-center gap-2 rounded-xl border bg-surface/80 shadow-[0_0_0_1px_rgba(0,0,0,0.2)] transition focus-within:border-amber/70 focus-within:shadow-[0_0_0_4px_rgba(244,184,96,0.12)] ${
          error ? "border-rose/60" : "border-line-2"
        } ${lg ? "p-1.5 pl-4" : "p-1 pl-3"}`}
      >
        <IconSearch className="shrink-0 text-faint" width={lg ? 18 : 15} height={lg ? 18 : 15} />
        <label htmlFor={`${errId}-input`} className="sr-only">GitHub repository URL</label>
        <input
          id={`${errId}-input`}
          name="url"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          placeholder="github.com/owner/repository"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errId : undefined}
          className={`min-w-0 flex-1 bg-transparent font-mono text-fg placeholder:text-faint focus:outline-none ${lg ? "py-2.5 text-[15px]" : "py-1.5 text-sm"}`}
        />
        <button
          type="submit"
          disabled={pending}
          className={`shrink-0 rounded-lg bg-amber font-medium text-ink transition hover:bg-amber-2 disabled:opacity-70 ${lg ? "px-5 py-2.5" : "px-3 py-1.5 text-sm"}`}
        >
          {pending ? "Mapping…" : lg ? "Explore" : "Go"}
        </button>
      </div>
      {error && (
        <p id={errId} role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-rose">
          <IconAlert /> {error}
        </p>
      )}
    </form>
  );
}
