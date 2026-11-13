# Next steps

**The complete, verified publishing and deployment procedure is in [PUBLISH.md](PUBLISH.md).** The launch checklist, communities and announcements are in [LAUNCH.md](LAUNCH.md), and the issues to open are in [STARTER_ISSUES.md](STARTER_ISSUES.md).

Summary of the order: publish repo → verify fresh clone and CI → deploy on Vercel with `GITHUB_TOKEN` → `scripts/verify-deployment.sh` → open starter issues → tag v0.1.0 → launch week.

---

## Engineering follow-ups (any contributor)
1. Monorepo package import resolution (`src/lib/analysis/imports.ts`, `aliasesFromTsconfig` → workspace packages).
2. Verify the Anthropic provider with a real key; consider defaulting `AI_MODEL` to a cheaper model for public deployments.
3. Shared (cross-instance) rate limiting before enabling AI on a public deployment.
4. Return HTTP 404 for invalid repo routes (move validation to `generateMetadata` or a `proxy.ts`).
5. Test the analyzer against a broad set of real repositories once deployed (the build sandbox could reach only one).
