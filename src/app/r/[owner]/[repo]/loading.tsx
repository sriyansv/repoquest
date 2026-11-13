import { SiteHeader } from "@/components/SiteHeader";

const STEPS = ["Reading repository metadata", "Walking the file tree", "Reading source files & imports", "Drawing the architecture map", "Checking open issues"];

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1" aria-busy="true" aria-live="polite">
        <div className="border-b border-line/70">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
            <div className="mt-4 h-9 w-72 max-w-full animate-pulse rounded bg-surface-2" />
            <div className="mt-3 h-4 w-[32rem] max-w-full animate-pulse rounded bg-surface" />
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-surface/60" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
          <ol className="space-y-3 text-sm text-muted" aria-label="Analysis progress">
            {STEPS.map((s, i) => (
              <li key={s} className="flex animate-rise items-center gap-3" style={{ animationDelay: `${i * 450}ms` }}>
                <span className="size-2 animate-pulse rounded-full bg-amber" />
                {s}
              </li>
            ))}
          </ol>
        </div>
        <span className="sr-only">Mapping repository, please wait…</span>
      </main>
    </>
  );
}
