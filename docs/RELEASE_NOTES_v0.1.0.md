## RepoQuest 0.1.0: first public release

Understand any codebase. Find your way in. Make your first contribution.

**Try it:** https://repoquest-seven.vercel.app

### Features
- **Import any public GitHub repository** by URL (full URL, `/tree/…` link, `owner/repo` or SSH form), with rate-limit handling and large-repo support (tested on `vercel/next.js`)
- **File explorer:** search, syntax-highlighted preview, entry points, uses / used-by navigation, deep links
- **Interactive architecture map:** relationships confirmed by import statements are drawn separately from guesses based on folder names, with an evidence panel showing the exact statements. Monorepo workspace packages (JS) and crates (Rust) are resolved.
- **Source-cited summary**, run instructions and execution flow, with no AI required
- **Optional AI explanations** (Claude or a local Ollama model), grounded in fetched files only. Off on the public instance.
- **First-contribution assistant** that reads issue content, assignees, blockers and age, not just labels
- **Shareable guide pages** with social preview images
- Accessible (axe: 0 violations), responsive, dark-first UI

### Verified before release
Lint, typecheck, 184 unit/component tests, production build, GitHub Actions CI, 13/13 deployment checks, Playwright end-to-end tests on desktop and mobile against production, and analyses of 7 real repositories (flask, ripgrep, excalidraw, fastapi, fzf, got, next.js). Testing them found 5 analysis bugs, all fixed in this release.

### Known limitations
Regex-based import analysis over a sample of up to 80 files (arrows can be missing, never invented); PHP, C# and Java wildcard imports are not resolved yet ([#1](https://github.com/sriyansv/repoquest/issues/1), [#2](https://github.com/sriyansv/repoquest/issues/2), [#4](https://github.com/sriyansv/repoquest/issues/4)); per-visitor rate limiting is best effort on serverless. Full list in the README.

### Contributing
Six starter issues are open, five of them labelled `good first issue`. See [CONTRIBUTING.md](https://github.com/sriyansv/repoquest/blob/main/CONTRIBUTING.md). Built with substantial help from Claude Code.
