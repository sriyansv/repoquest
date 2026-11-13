# Roadmap

RepoQuest's roadmap is driven by real limitations found while building and using it. Items marked **good first issue** are scoped for newcomers. Each one should become a GitHub issue with enough detail to start.

## Now (v0.2): accuracy of the map

- [x] **Monorepo package imports.** JS workspace packages and Rust workspace crates resolve to confirmed edges (v0.1.0).
- [ ] **Shared rate limiting** across server instances (e.g. Upstash Redis free tier), since in-memory limits don't hold on serverless.
- [ ] **Python `src/` layouts with namespace packages.** Better resolution when there is no `__init__.py`.
- [ ] C# `using` extraction: [#1](https://github.com/sriyansv/repoquest/issues/1) *(good first issue)*
- [ ] PHP `use`/`require` extraction: [#2](https://github.com/sriyansv/repoquest/issues/2) *(good first issue)*
- [ ] "Files analyzed" per module: [#3](https://github.com/sriyansv/repoquest/issues/3) *(good first issue)*
- [ ] Java/Kotlin wildcard imports: [#4](https://github.com/sriyansv/repoquest/issues/4) *(good first issue)*
- [ ] `/` shortcut for file search: [#5](https://github.com/sriyansv/repoquest/issues/5) *(good first issue)*
- [ ] Go package-level edges: [#6](https://github.com/sriyansv/repoquest/issues/6) *(help wanted)*

## Next (v0.3): learning experience

- [ ] **Guided tour mode.** A step-by-step walk from entry point → core modules → tests.
- [ ] **Glossary.** Explain detected frameworks (e.g. "What is a Next.js layout?") with links to official docs.
- [ ] **File-level graph** for a selected module.
- [ ] **Linked PR detection** for issues via the timeline API (opt-in, to save quota).
- [ ] **More keyboard shortcuts** (`g a` for architecture, etc.)
- [ ] Light theme. *(good first issue)*

## Later

- [ ] Optional persistence (e.g. Supabase) for saved explorations and shared annotations.
- [ ] Tree-sitter parsing for languages where regex is insufficient, loaded lazily per language.
- [ ] GitLab / Codeberg support.
- [ ] A CLI (`npx repoquest owner/repo --markdown`) that writes a newcomer guide to a file.
- [ ] Shared rate limiting for the AI endpoint (Upstash or similar).

## Done (v0.1)

- [x] GitHub URL import with validation, rate-limit handling, large-repo truncation
- [x] File explorer with search, preview, highlighting, uses/used-by links, deep links
- [x] Architecture map with confirmed vs inferred edges and evidence panel
- [x] Source-cited summaries, entry points, execution flow (no AI needed)
- [x] Optional grounded AI explanations (Claude or Ollama)
- [x] Content-based first-issue assessment
- [x] Shareable guide pages and social images
- [x] CI, unit tests, documentation
