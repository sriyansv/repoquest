# Project status

_Last updated: 2026-11-13, launch preparation._ Version: **0.1.0**. **Not yet published, not yet deployed, not released.**

## Feature status

| Feature | Status | Verified by |
|---|---|---|
| A. GitHub importer (URL validation, metadata, README, tree, files, rate limits, large repos) | ✅ Done | Unit tests (URL parsing, scale tests with 15k files); live import of `sriyansv/gemsontop`; error pages for invalid, nonexistent and blocked repos in the browser |
| B. Codebase explorer (tree, search, languages, entry points, preview, navigation) | ✅ Done | Playwright: open a file, deep link `?tab=files&path=…`, uses/used-by links, mobile |
| C. Architecture visualizer (interactive, confirmed vs inferred) | ✅ Done | Playwright: nodes/edges render, click → evidence panel; unit tests for graph and layout |
| D. Explanations (grounded, no invented functionality) | ✅ Done (no-AI summary). ⚠️ AI path verified with a fake Ollama server only | Unit tests; end-to-end via local fake Ollama (prompt contents, rendering, XSS safety) |
| E. First-contribution assistant | ✅ Done | Unit tests (verdict logic); jsdom component tests for issue cards. Not seen with real issues in a browser (the only reachable repo has none) |
| F. Shareable guide pages + OG images | ✅ Done | HTTP 200 + screenshot; OG image renders (HTTP 200, PNG) |

## Quality gates (commands run, results)

| Command | Result |
|---|---|
| `npm run lint` | ✅ 0 problems |
| `npm run typecheck` | ✅ 0 errors |
| `npm test` | ✅ 163 passed, 1 skipped (the live test, opt-in) |
| `LIVE=1 npx vitest run tests/live.test.ts` | ✅ passed (sriyansv/gemsontop) |
| `npm run build` | ✅ succeeds |
| Fresh standalone extraction: `npm ci && lint && typecheck && test && build` | ✅ all pass |
| `scripts/verify-deployment.sh` against a local production build | ✅ 13/13 checks |
| Per-IP limits (analysis, file preview) | ✅ block at the limit, other IPs unaffected |
| Playwright e2e (landing, search validation, all tabs, deep links, guide, error pages, iPhone 13) | ✅ all steps pass, **0 console errors**, 0 px horizontal overflow on mobile |
| axe-core (WCAG 2 A/AA + best practice) on landing, 4 tabs, guide, 404 | ✅ 0 violations |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| Secret scan (tokens, keys, private keys) over all tracked files | ✅ none found |

## Known issues and limitations
- Import analysis is regex-based and samples ≤ 80 files. Missing arrows are possible; invented arrows are not.
- Monorepo package-name imports, Go package-level edges, and Java wildcard imports are not resolved (see ROADMAP).
- `/r/<invalid>` renders the 404 page with HTTP 200 (Next.js streaming with `loading.tsx`); the page is `noindex`.
- Rate limits (analysis, file preview, AI) are in-memory per server instance.
- Issue assessment does not check for linked PRs.
- The Anthropic provider has not been called with a real key.
- Header/footer "Source" links point to `https://github.com/sriyansv/repoquest`, which does not exist until you create it (configurable with `NEXT_PUBLIC_REPO_URL`).
