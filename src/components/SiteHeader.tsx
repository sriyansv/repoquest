import Link from "next/link";
import { REPO_URL } from "@/lib/site";
import { IconGithub } from "./icons";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="8" fill="#14181d" stroke="#313946" />
        <path d="M9 22c3-1 3-6 7-7s4-5 7-6" fill="none" stroke="#f4b860" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 4.2" />
        <circle cx="9" cy="22" r="2.6" fill="#5fd4c4" />
        <path d="M23 6.5v5M23 6.5h3.5l-1 1.3 1 1.2H23" fill="#f4b860" stroke="#f4b860" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span className="font-semibold tracking-tight">RepoQuest</span>
    </span>
  );
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line/70 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md" aria-label="RepoQuest home">
          <Logo />
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        <nav className="flex items-center gap-1 text-sm text-muted">
          <Link href="/#how" className="hidden rounded-md px-2.5 py-1.5 hover:text-fg sm:inline">How it works</Link>
          <a
            href={REPO_URL}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:text-fg"
            target="_blank"
            rel="noreferrer"
          >
            <IconGithub /> <span className="hidden sm:inline">Source</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-auto border-t border-line/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <Logo className="text-muted" /> <span className="ml-2">MIT licensed. Not affiliated with GitHub.</span>
        </p>
        <p className="flex gap-4">
          <a className="hover:text-fg" href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
          <a className="hover:text-fg" href={`${REPO_URL}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">Contribute</a>
          <a className="hover:text-fg" href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">Report an issue</a>
        </p>
      </div>
    </footer>
  );
}
