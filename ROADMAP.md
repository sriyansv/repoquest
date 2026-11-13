# Roadmap

RepoQuest's roadmap is driven by real limitations found while building and using it. Items marked **good first issue** are scoped for newcomers. Each one should become a GitHub issue with enough detail to start.

## Now (v0.2): accuracy of the map

- [ ] **Monorepo package imports.** Resolve `@org/pkg` imports to `packages/pkg` by reading workspace `package.json` names. Today they show as external packages.
- [ ] **Python `src/` layouts with namespace packages.** Better resolution when there is no `__init__.py`.
- [ ] **Go: link to the whole package, not the first file.** Edges currently point at the first `.go` file of the imported package. *(good first issue)*
- [ ] **Java/Kotlin wildcard imports** (`import com.x.*`) → package directory. *(good first issue)*
- [ ] **PHP (`use`, `require`) and C# (`using`) import extraction.** *(good first issue, one language per PR)*
- [ ] Show "N of M files analyzed" per module in the architecture side panel. *(good first issue)*

## Next (v0.3): learning experience

- [ ] **Guided tour mode.** A step-by-step walk from entry point → core modules → tests.
- [ ] **Glossary.** Explain detected frameworks (e.g. "What is a Next.js layout?") with links to official docs.
- [ ] **File-level graph** for a selected module.
- [ ] **Linked PR detection** for issues via the timeline API (opt-in, to save quota).
- [ ] **Keyboard shortcuts** (`/` to search files, `g a` for architecture). *(good first issue)*
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
