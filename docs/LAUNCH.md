# Launch kit

Rules for this launch:
- **Only claim what is verified.** No "live" claim before `scripts/verify-deployment.sh` passes, and no numbers (users, stars, analyses) that weren't measured.
- **No vote or star solicitation**, no sock-puppet accounts, no cross-posting the same text everywhere on one day.
- **Disclose AI assistance.** RepoQuest was built with substantial help from Claude Code, and it has an optional AI feature. Several communities care about this, and one (r/opensource) currently bans such projects. Saying so up front is honest and avoids removals.

---

## 1. Launch checklist

### A. Before publishing (done in the build session ✅ / to do ☐)
- ✅ Lint, typecheck, 163 unit/component tests, production build: all pass
- ✅ Fresh standalone extraction builds with `npm ci` (no hidden dependency on the parent repo)
- ✅ Browser e2e on desktop and iPhone viewport: no console errors, no horizontal overflow
- ✅ axe accessibility audit: 0 violations on all pages
- ✅ `npm audit --omit=dev`: 0 vulnerabilities; secret scan clean
- ✅ Per-IP limits protect the shared GitHub token; verified that they block and recover
- ☐ Read README, CONTRIBUTING and SECURITY once more as a newcomer would

### B. Publish (see `docs/PUBLISH.md`, Part 1)
- ☐ Create empty public repo `sriyansv/repoquest`
- ☐ `git subtree split` + push to `main`
- ☐ Fresh clone of the published repo: `npm ci && npm run lint && npm run typecheck && npm test && npm run build`
- ☐ CI workflow is green on GitHub
- ☐ Description, topics, Issues/Discussions on; private vulnerability reporting, Dependabot and secret scanning enabled

### C. Deploy (Part 2)
- ☐ Fine-grained `GITHUB_TOKEN` (public repos, read-only) added in Vercel
- ☐ Deploy; set `NEXT_PUBLIC_SITE_URL`; redeploy
- ☐ `./scripts/verify-deployment.sh https://<domain> pallets/flask` → "All checks passed."
- ☐ Manual check on desktop and phone: all four tabs, share link, social card preview
- ☐ Try 3–5 very different repos (a Python lib, a Go CLI, a big JS monorepo, a tiny static site, a repo with many open issues) and note any wrong analysis as issues. **This is your real pre-launch QA, since the build sandbox could reach only one repository.**
- ☐ Add the live URL to the README and the repo's About

### D. Make it contributor-ready
- ☐ Open the issues in `docs/STARTER_ISSUES.md` (5 rate "good first issue" with RepoQuest's own assessor)
- ☐ Tag `v0.1.0` and publish the release (notes below)
- ☐ Pin one issue: "Feedback wanted: which repos does RepoQuest get wrong?"

### E. Launch week
- ☐ Day 1: Show HN (weekday morning US time is commonly recommended; there's no official rule)
- ☐ Day 1–2: DEV Community article
- ☐ Next Saturday: r/webdev Showoff Saturday thread
- ☐ Spread the rest over 1–2 weeks (one community per day at most), each with a post written for that audience
- ☐ Reply to every comment within a day; turn bug reports into issues and thank reporters by name in the fix PR
- ☐ After one week: record **real** numbers in `docs/CLAUDE_FOR_OSS.md` → Evidence log (stars, external PRs merged, issues opened by others)

### F. Watch for problems
- ☐ Vercel → Logs: look for 5xx errors and slow functions
- ☐ GitHub rate limit: the explorer's sidebar shows remaining quota. If it drops near 0 during a traffic spike, lower `ANALYSIS_RATE_LIMIT_PER_10_MIN` or add caching
- ☐ Keep AI disabled until you decide on a budget

---

## 2. Ten potential early-user communities

Ordered from "fits now" to "fits later". Rules change, so **read each community's current rules before posting**. Notes reflect what was checked on 2026-11-13.

| # | Community | Why RepoQuest fits | Entry rules / timing |
|---|---|---|---|
| 1 | **Hacker News: Show HN** (news.ycombinator.com/show) | Developers who explore unfamiliar code daily; good technical critique of the analyzer approach | Must be something people can try now (not a landing page); title starts with "Show HN:"; no vote solicitation. Post **after** the deployment check passes. ([guidelines](https://news.ycombinator.com/showhn.html)) |
| 2 | **DEV Community** (dev.to), tags `#showdev`, `#opensource`, `#beginners` | Large beginner audience; `#showdev` is for showing what you built | Write a real article (e.g. "How RepoQuest decides whether a 'good first issue' is really good"), not an ad. Moderators remove tags from overly salesy posts. ([#showdev moderator notes](https://dev.to/cicirello/about-the-showdev-tag-from-one-of-the-showdev-moderators-3beh)) |
| 3 | **r/webdev**: weekly *Showoff Saturday* thread | Web developers; the project is a Next.js app with an interesting React Flow UI | Share projects **only** in the Saturday thread; posts outside it get removed. |
| 4 | **r/SideProject** | Explicitly for sharing side projects and getting feedback | Check the sidebar for title format; bare link drops are removed. Ask a specific feedback question. |
| 5 | **freeCodeCamp Forum**, project feedback category ("I Built This" / "Code Feedback") | Learners, RepoQuest's core audience | New topics need forum trust level 1; give feedback on others' projects too; don't sell anything. ([category](https://forum.freecodecamp.org/c/project-feedback/409)) |
| 6 | **r/learnprogramming** | Exactly the target user: people learning to read real code | Self-promotion must be sparing and tasteful, and the resource must be reasonably complete. Read the current wiki before posting. A "how I read a new codebase" post that mentions the tool fits better than an announcement. |
| 7 | **Up For Grabs** (up-for-grabs.net) | Lists projects that curate small tasks for newcomers. RepoQuest is itself a beginner-friendly project to contribute to | Listing is a PR adding a YAML file; needs an active project, available maintainers and a curated list of small tasks. Do it **after** the starter issues are open. ([how to list](https://github.com/up-for-grabs/up-for-grabs.net/blob/gh-pages/docs/list-a-project.md)) |
| 8 | **awesome-for-beginners** (github.com/MunGell/awesome-for-beginners), TypeScript section | Large, well-known list newcomers browse for first projects | Requires a beginner label (e.g. `good first issue`/`first-timers-only`) with real issues. Submit after D is done. |
| 9 | **Maintainers of beginner-heavy open-source projects** (one-to-one) | A RepoQuest guide link in a CONTRIBUTING file could help their newcomers find their way | Open an issue or discussion **only** where newcomer onboarding is an explicit goal; offer, don't push; accept "no". Never open drive-by PRs adding your link. |
| 10 | **goodfirstissue.dev** (deepsourcelabs/good-first-issue) | Curated list of projects with beginner issues | **Not eligible yet:** requires ≥ 10 contributors, ≥ 3 open beginner-labelled issues, README, CONTRIBUTING and a licence. A milestone to aim for. ([criteria](https://github.com/deepsourcelabs/good-first-issue)) |

**Deliberately excluded for now**
- **r/opensource:** news reports from late October 2026 say its rules now bar AI-assisted or AI-related projects and require projects to be about a year old with several contributors. RepoQuest doesn't qualify. ([report](https://runtimewire.com/article/r-opensource-bars-ai-projects-and-requires-a-year-of-maintenance-for-promotion))
- **Product Hunt:** common launch playbooks rely on lining up upvoters in advance, which conflicts with this launch's no-manipulation rule.

---

## 3. Announcements

Fill in `<URL>` only after verification. All statements below are true for v0.1.0 as built.

### X (under 280 characters)

> I built RepoQuest, an open-source tool for finding your way around an unfamiliar GitHub repo.
>
> Paste a URL → architecture map from real imports (guesses marked as guesses), file explorer, and a check of which open issues are realistic first PRs.
>
> Free, MIT, built with Claude Code.
> <URL>

Attach a screenshot of the Architecture tab (`docs/screenshots/architecture.png`) or, better, a fresh one of a well-known repo from the live site.

### Show HN

**Title:** `Show HN: RepoQuest – a map of any GitHub repo for first-time contributors`

**Text:**
> RepoQuest takes a public GitHub URL and shows: an interactive module diagram, a file explorer with "uses / used by" links, a summary where every sentence cites the file it came from, and an assessment of open issues for newcomers.
>
> Two design choices I'd like feedback on:
>
> 1. An arrow is "confirmed" only if an import/require/#include/<script> statement resolves to a file that exists in the tree. Folder-name guesses ("tests/ probably tests src/") are drawn dashed and labelled. Parsing is regex-based over a sample of up to 80 files, so arrows can be missing, but it shouldn't invent any.
> 2. An issue is called a "good first issue" only if it has a positive label and a substantive description, and isn't assigned, locked or labelled as needing discussion. The UI shows the reasons.
>
> It works without any AI. There are optional "explain this file" buttons (Claude or a local Ollama model) that only see fetched files, but they're off on the public instance.
>
> Limitations: GitHub only, public repos only, no monorepo package resolution yet, no linked-PR detection.
>
> Next.js + React Flow, MIT. I built it with a lot of help from Claude Code. Code: https://github.com/sriyansv/repoquest
>
> I'd especially like to hear about repos where the map is wrong.

### DEV Community article outline
Title: *"A 'good first issue' label isn't enough: how RepoQuest checks issues for newcomers"*
1. The problem: stale, vague, or already-claimed beginner issues
2. What RepoQuest checks (labels, description, assignees, blockers, staleness) with real code excerpts from `src/lib/analysis/issues.ts`
3. Confirmed vs inferred: why the map refuses to guess
4. Try it: `<URL>`; contribute: the starter issues
5. Disclosure: built with Claude Code; the optional AI feature is off by default

### GitHub release notes: v0.1.0

> **RepoQuest 0.1.0: first public release**
>
> Understand any codebase. Find your way in. Make your first contribution.
>
> - Import any public GitHub repository by URL, with rate-limit handling, large-repo truncation and per-visitor limits that protect a shared token
> - File explorer: search, syntax-highlighted preview, entry points, uses / used-by navigation, deep links
> - Interactive architecture map with confirmed (import-based) and inferred (naming-based) relationships, clearly distinguished, plus an evidence panel
> - Source-cited summary, run instructions and execution flow, with no AI required
> - Optional AI explanations (Claude or local Ollama), grounded in fetched files only
> - First-contribution assistant that reads issue content, not just labels
> - Shareable guide pages with social preview images
> - Accessible (axe-clean), responsive, dark-first UI
>
> Known limitations: see the README. Feedback on wrong analyses is very welcome: use the "Wrong or missing analysis" issue form.
