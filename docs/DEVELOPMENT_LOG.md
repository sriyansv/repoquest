# Development log

A factual record of the initial build sprint, written so another engineer (or Claude Code session) can resume without repeating work.

## Session 1: 2026-11-13 (initial sprint)

### Repository audit and architecture decision
- Audited `sriyansv/gemsontop`: a static HTML/CSS/JS fan site for the Alpha GEMS community (5 browser games, a quiz, a contest page, a short-film page), 9 commits, no build tooling or package manager.
- **Decision: RepoQuest gets its own repository.** It is unrelated to the fan site and needs its own CI, issues, releases and licence. Because this session could only push to `sriyansv/gemsontop`, RepoQuest was built as a self-contained project in `repoquest/` on branch `ccr-da8008d0-5telad`, with no changes to the existing site files. See `docs/NEXT_STEPS.md` for the one-command extraction into `sriyansv/repoquest`.
- Model-router plugin: **not installed** in this environment. The fallback was Claude Code subagents with explicit models (see "Model routing" below).

### Milestone 1: core library (commit `5054fae`)
- Next.js 16.4 + React 19 + TypeScript + Tailwind v4 scaffold. `cacheComponents` was disabled in favour of the simpler `fetch` revalidate model (documented in Next's bundled docs).
- GitHub client (`src/lib/github/client.ts`): typed errors, rate-limit header capture, timeouts, raw-file fetching with binary/size guards, bounded concurrency.
- Importer (`repo.ts`): about 6 REST calls per repository, plus up to 80 files from raw.githubusercontent.com.
- Pure analysis: languages, modules and entry points, import extraction and resolution for 10+ languages, architecture graph (confirmed vs inferred), layered layout, execution flow, source-cited summary, content-based issue assessment.
- AI provider abstraction: Anthropic SDK (with server-side refusal fallback), Ollama, or none.
- Live smoke test against `sriyansv/gemsontop` passed. It found that HTML `<a href>` was reported as "imports", so a `relation` field (`import | script | stylesheet | link`) was added.

### Milestone 2: UI (commit `e9c70db`)
- Landing page with a live demo: RepoQuest's analysis of its own source (`npm run demo:build`). No mock data.
- Explorer with four accessible tabs (Overview, Files, Architecture, First contribution), deep links, and a share button.
- Guide pages, per-repo OpenGraph images, robots and sitemap, a no-JS `/go` fallback, and loading/error/not-found states.
- Module grouping refined (nested containers such as `src/lib/github`) after the self-analysis looked too coarse.

### Milestone 3: docs, CI, QA (commit `82480b6` and later)
- README, ARCHITECTURE, ROADMAP, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue forms, PR template, CI workflow, `vercel.json`, MIT licence, `.env.example`.
- QA fixes from browser testing:
  - Selected edges were animated, which looked dashed, and dashed means "inferred". Animation removed.
  - "A HTML project" changed to "An HTML project" (acronym-aware article).
  - Double focus ring: the global `:focus-visible` rule moved into `@layer base`.
  - WCAG contrast: `faint` changed from `#6b7384` (3.5–4.1:1) to `#7d8696` (≥ 4.5:1 on all surfaces).
  - axe: duplicate search landmarks, colour-only links, and invalid `<dl>` fixed. All audited pages are now clean.
  - Markdown link stripping left a stray `)` for URLs containing parentheses. Fixed in three places.
- Python import bug found by the delegated test-writing agent: `from . import a, b` swallowed the next line. Fixed, and regression tests added.

### Model routing (actual usage)
| Task | Model | Outcome |
|---|---|---|
| Audit, architecture, analysis engine, UI, security, QA, debugging | Opus (main session) | Done |
| Unit tests for `src/lib` (≈150 tests) | Sonnet subagent | Done. Found 1 real bug (Python imports), fixed by main session |
| CODE_OF_CONDUCT, SECURITY, CONTRIBUTING, issue/PR templates | Haiku subagent | Done. Reviewed for fabricated contacts (none found) |

No Fable usage. No paid services were purchased.

### Test results (final run of this session)
See `docs/PROJECT_STATUS.md` for the exact commands and outcomes.

### Blockers encountered
- The sandbox network allows the GitHub API only for `sriyansv/gemsontop`. Other repositories return 403 here, so live testing used that repo, and other behaviour is covered by fixtures and unit tests. In production, any public repository works.
- No `ANTHROPIC_API_KEY` in this environment. The AI path was verified end to end against a local fake Ollama server (`AI_PROVIDER=ollama`). The Anthropic request shape is type-checked against `@anthropic-ai/sdk@1.8.0` but has **not** been executed against the real API.
