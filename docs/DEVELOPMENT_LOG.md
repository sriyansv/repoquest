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

## Session 2: 2026-11-13 (launch preparation)

- Verified that branch `ccr-da8008d0-5telad` is clean and identical to `origin` (HEAD `d4bb09d`), and that nothing outside `repoquest/` differs from the original gemsontop commit `ff4ff6f`.
- **Standalone extraction:** `git subtree split --prefix=repoquest` was cloned into a fresh directory, then `npm ci && npm run lint && npm run typecheck && npm test && npm run build` were run, the same steps as CI. All passed (163 tests). `next-env.d.ts` (gitignored) is not needed for typecheck. The extracted build was served, and all routes returned the expected status and content types.
- **Launch hardening:** public deployments share one `GITHUB_TOKEN`, and analyses had no per-visitor limit. Added `src/lib/github/guard.ts`: per-IP limits on analyses (60 per 10 min) and file previews (300 per 10 min), counted once per request through React `cache()`, with a friendly error page. Verified with a limit of 3: views 1–3 allowed, view 4 limited, another IP unaffected; file preview 3 → HTTP 429. Added `maxDuration` to the page, guide, social image and AI routes.
- The default limit was raised from 40 to 60 after my own test traffic hit 40, which showed that a classroom behind one NAT address could hit it too.
- Added `scripts/verify-deployment.sh` (13 checks). It passes against a local production build.
- Docs: `docs/PUBLISH.md` (publish, deploy, release), `docs/LAUNCH.md` (checklist, 10 communities with researched rules, announcements), `docs/STARTER_ISSUES.md` (6 issues; 5 rated "good first issue" by RepoQuest's own assessor, 1 "possible").
- Research finding: r/opensource reportedly changed its rules in October 2026 to bar AI-assisted projects, so it was removed from the launch plan. goodfirstissue.dev needs ≥ 10 contributors, so it's a later milestone.
- **Not done (needs the owner's accounts):** creating `sriyansv/repoquest`, Vercel deployment, release tag. Nothing has been published or deployed.

## Session 3: 2026-11-13 (publication and deployment)

**Access.** This session could not create repositories or reach Vercel on its own. The owner created the empty `sriyansv/repoquest` and granted access. A new personal cloud environment opened `api.vercel.com`, `vercel.com` and later `repoquest-seven.vercel.app`. The owner supplied a Vercel token through the secure credential form, so the value was never visible to the session or logged. The first token couldn't create projects; a full-account token replaced it.

**Published.** `git subtree split --prefix=repoquest` pushed to `sriyansv/repoquest` `main` with history preserved (5 commits). The repo is public, `main` is the default branch, and GitHub recognises the MIT licence. CI run #1 passed.

**Deployed.** A Vercel project `repoquest` was created in the same Hobby scope as the existing `gemsontop` project (left untouched) and linked to the GitHub repo, so pushes to `main` auto-deploy. Node was pinned to 22.x, the version all tests ran on. Env: `NEXT_PUBLIC_REPO_URL`, `NEXT_PUBLIC_SITE_URL=https://repoquest-seven.vercel.app`, `NEXT_TELEMETRY_DISABLED`. `repoquest.vercel.app` belongs to someone else. `verify-deployment.sh` passed 13/13 against production with `pallets/flask`.

**Issues opened:** #1–#6 from `docs/STARTER_ISSUES.md`.

**Bugs found by testing production on real repositories (all fixed, with regression tests):**
| Repo | Symptom | Cause | Fix |
|---|---|---|---|
| BurntSushi/ripgrep | 21 modules, 1 confirmed edge | Workspace crates imported by name (`use grep_searcher::…`) | Workspace package resolution (JS + Rust) → 14 edges |
| (unit test) | `packages/core/src` shown as a module | `core` treated as a nested group inside a workspace folder | Workspace folders keep the package as the module |
| fastapi/fastapi | `docs_src` had no edges | Sampler preferred empty `__init__.py` files | Skip empty files → `docs_src → fastapi` (27 statements) |
| sindresorhus/got | No entry point | Top-level conditional `exports` pointing at uncommitted `dist/` | Shared `exportsEntry` parser + build-output → source mapping → `source/index.ts` |
| excalidraw/excalidraw | Dockerfile as the only entry; 12/12 issues "good first" | Root `start` runs `yarn --cwd ./excalidraw-app`; no age signal | Follow script working dir → `excalidraw-app/index.tsx`; flag issues open 2+ years → 10/12 |

**Rate limiting in production:** see PROJECT_STATUS "Known issues" #2. Tested with 75, 135 and 135 requests (WAF with the 429 action, then the Deny action) and 70 explorer requests: none were limited. Documented honestly rather than claimed.

**Production QA:** Playwright e2e (desktop + iPhone 13) with 0 console errors; axe 0 violations on 7 pages; screenshots retaken from production (ripgrep, excalidraw).

**Model routing in this session:** all work ran in the main session (Opus). No subagents were used, because every step depended on live credentials and production state in this session.

**Release:** creating the `v0.1.0` tag was attempted after the final verification (13/13 checks with BurntSushi/ripgrep, CI runs 1–5 all green). The session's git proxy rejected the tag push with HTTP 403, and no GitHub tool available to the session can create tags or releases. The release is left to the owner (NEXT_STEPS #2). Nothing was published under a tag.

**Vercel firewall:** a rate-limit rule ("Analysis rate limit", `/r/*`, 120 requests per 600 s per IP, follow-up action Deny) remains configured on the project. It is harmless if not enforced and helpful if Vercel starts enforcing it; remove it under Project → Firewall if unwanted.
