# Next steps

Exact actions, in order. Steps 1–4 need the repository owner (they require GitHub/Vercel authentication).

## 1. Create the standalone repository (owner action)

1. On GitHub, create an **empty public** repository `sriyansv/repoquest` (no README, licence or .gitignore, since they already exist).
2. From a local clone of `gemsontop`:

```bash
git fetch origin ccr-da8008d0-5telad
git checkout ccr-da8008d0-5telad
git subtree split --prefix=repoquest -b repoquest-main   # history of repoquest/ only, at the repo root
git push https://github.com/sriyansv/repoquest.git repoquest-main:main
```

3. In `sriyansv/repoquest` → Settings: add a description ("Understand any codebase. Find your way in. Make your first contribution.") and topics (`github`, `open-source`, `developer-tools`, `code-visualization`, `good-first-issue`, `nextjs`). Enable **Issues**, **Discussions** (optional) and **Private vulnerability reporting** (Security tab).
4. Check that the **CI** workflow runs green on `main`.

The `repoquest/` folder can then be removed from `gemsontop` (or kept). That's your call. Nothing in the fan site depends on it.

## 2. Deploy to Vercel (owner action, free Hobby plan)

1. vercel.com → Add New → Project → import `sriyansv/repoquest`.
2. Environment variables: `GITHUB_TOKEN` (a fine-grained token with **no** permissions is enough for public data; strongly recommended), optionally `ANTHROPIC_API_KEY` and `AI_MODEL`.
3. Deploy, then set `NEXT_PUBLIC_SITE_URL` to the production URL and redeploy.
4. Smoke test: `/`, `/r/pallets/flask`, `/r/pallets/flask/guide`, `/r/pallets/flask/opengraph-image`, plus an invalid URL.

## 3. First release

Once CI is green and the deployment works: create tag `v0.1.0` and a GitHub release using the notes in `docs/LAUNCH.md`. Add screenshots from the live site to the README (`docs/screenshots/`).

## 4. Seed real issues

Open the roadmap items marked *good first issue* in `ROADMAP.md` as GitHub issues, with clear descriptions and acceptance criteria. RepoQuest's own assessor should rate them "good first". Label them `good first issue` / `help wanted`.

## 5. Engineering follow-ups (any contributor)
1. Monorepo package import resolution (`src/lib/analysis/imports.ts`, `aliasesFromTsconfig` → workspace packages).
2. Verify the Anthropic provider with a real key; consider defaulting `AI_MODEL` to a cheaper model for public deployments.
3. Shared rate limiting for `/api/explain` before enabling AI on a public deployment.
4. Return HTTP 404 for invalid repo routes (move validation to `generateMetadata` or a `proxy.ts`).
