# Project status

_Last updated: 2026-11-13._ Version **0.1.0**.

| | |
|---|---|
| Source | https://github.com/sriyansv/repoquest (public, MIT, default branch `main`) |
| Production | https://repoquest-seven.vercel.app (Vercel Hobby, auto-deploys from `main`) |
| CI | GitHub Actions `CI` (lint, typecheck, tests, build) on every push and PR |
| Release | v0.1.0 **not yet published**: notes ready in `docs/RELEASE_NOTES_v0.1.0.md`; the owner creates the tag and release in one step (see NEXT_STEPS #2) |

## Feature status (verified in production)

| Feature | Status | Verified by |
|---|---|---|
| A. GitHub importer | ✅ | Production analyses of pallets/flask, BurntSushi/ripgrep, excalidraw/excalidraw, fastapi/fastapi, junegunn/fzf, sindresorhus/got, vercel/next.js; invalid and missing repos show friendly errors (real GitHub 404) |
| B. Codebase explorer | ✅ | Production e2e: file tree, search, preview, deep links (`?tab=files&path=src/flask/app.py`), uses/used-by |
| C. Architecture map | ✅ | Production e2e: render, pan/zoom, module click with file-level evidence; ripgrep shows 14 confirmed relationships between crates |
| D. Explanations | ✅ grounded summary (no AI). The AI path is off in production (no key); verified end to end locally against a fake Ollama server | Unit + local e2e |
| E. First-contribution assistant | ✅ | Production: excalidraw issues assessed (10 of 12 rated good first; 2 flagged as open for years) |
| F. Shareable guide pages + social images | ✅ | `verify-deployment.sh` (PNG social images, guide page) |

## Quality gates (latest results)

| Check | Result |
|---|---|
| `npm run lint` / `npm run typecheck` | ✅ 0 problems |
| `npm test` | ✅ 184 passed, 1 skipped (opt-in live test) |
| `npm run build` | ✅ |
| GitHub Actions CI on `main` | ✅ passing |
| `scripts/verify-deployment.sh https://repoquest-seven.vercel.app pallets/flask` | ✅ 13/13 checks (warning: no `GITHUB_TOKEN`) |
| Playwright e2e against production (desktop + iPhone 13) | ✅ all steps, 0 console errors, 0 px horizontal overflow |
| axe-core WCAG 2 A/AA against production (landing, 4 tabs, guide, 404) | ✅ 0 violations |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| Secret scan of tracked files | ✅ none |

## Known issues and limitations
1. **No `GITHUB_TOKEN` in production yet.** The site uses GitHub's anonymous limit (60 requests/hour, about 10 new analyses per hour; cached repeats are free). Under real traffic it will show "rate limited" pages until the owner adds a token (see NEXT_STEPS #1).
2. **Rate limiting is not verified in production.** In-app per-IP limits work locally but did not trigger on Vercel in testing (requests spread across instances; the test client may also use several egress IPs). A Vercel WAF rate-limit rule is configured (120 requests per 10 min per IP on `/r/*`) but was not observed to enforce on the Hobby plan with either the 429 or the Deny action. The impact is availability only; the Hobby plan cannot incur charges.
3. Import analysis is regex-based and samples ≤ 80 files per repo; arrows can be missing, never invented.
4. Not yet resolved: PHP, C#, Java wildcard imports (#1, #2, #4); Go package-level edges (#6); linked-PR detection for issues.
5. `/r/<invalid>` renders the 404 page with HTTP 200 (streaming); the page is `noindex`.
6. The Anthropic provider has not been exercised with a real key.
7. Repository topics are not set (no tool in the build session could set them).

## Adoption (real numbers, 2026-11-13)
Stars 0 · forks 0 · external contributors 0 · pull requests 0 · open issues 6 (starter issues opened by the maintainer). The repo was created today.
