import type { ReactNode } from "react";

export function Card({ title, children, aside, className = "" }: { title?: ReactNode; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface/60 ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line/80 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {aside}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function SourceChip({ source, onClick }: { source: string; onClick?: () => void }) {
  const cls = "ml-1.5 inline-flex max-w-full items-center rounded border border-line-2 bg-ink-2 px-1.5 py-px align-middle font-mono text-[11px] text-faint";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} hover:border-amber/50 hover:text-amber`} title={`Open ${source}`}>
        <span className="truncate">{source}</span>
      </button>
    );
  }
  return <span className={cls} title="Source of this statement"><span className="truncate">{source}</span></span>;
}

/** Render `inline code` spans in our own generated sentences. */
export function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("`") && p.endsWith("`") && p.length > 2 ? (
          <code key={i} className="rounded bg-ink-2 px-1 py-px font-mono text-[0.85em] text-amber-2">{p.slice(1, -1)}</code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function EvidenceBadge({ kind }: { kind: "confirmed" | "inferred" | "convention" | "mentioned" | "keyword" }) {
  const map = {
    confirmed: ["Confirmed", "border-teal/40 text-teal", "Found directly in a manifest or import statement"],
    mentioned: ["Mentioned", "border-teal/40 text-teal", "The issue text names this file"],
    convention: ["Convention", "border-violet/40 text-violet", "Matched a common file-naming convention; not declared anywhere"],
    inferred: ["Inferred", "border-violet/40 text-violet", "Guessed from naming conventions, not confirmed by code"],
    keyword: ["Keyword match", "border-violet/40 text-violet", "File name matches words in the issue title — a guess"],
  } as const;
  const [label, cls, title] = map[kind];
  return <span title={title} className={`inline-flex shrink-0 items-center rounded-full border px-2 py-px text-[11px] ${cls}`}>{label}</span>;
}
