# Publishing RepoQuest

How to move RepoQuest from the `repoquest/` folder of `sriyansv/gemsontop` into its own public repository, and how to deploy it. Every step ends with a verification. Don't announce anything until the step's check passes.

> **Status (2026-11-13): published at https://github.com/sriyansv/repoquest and deployed at https://repoquest-seven.vercel.app.** Parts 1 and 2 below were carried out; they remain as the reference for redeploying or self-hosting.

---

## Part 1: Create the standalone repository

### 1.1 Create the empty repository on GitHub
On GitHub → **New repository**:
- Owner `sriyansv`, name `repoquest`, **Public**
- Description: `Understand any codebase. Find your way in. Make your first contribution.`
- **Do not** add a README, .gitignore or licence (they already exist; adding them causes a conflict).

Or with the GitHub CLI: `gh repo create sriyansv/repoquest --public --description "Understand any codebase. Find your way in. Make your first contribution."`

### 1.2 Extract `repoquest/` with its history and push it

```bash
# Use a full (non-shallow) clone of gemsontop
git clone https://github.com/sriyansv/gemsontop.git
cd gemsontop
git checkout ccr-da8008d0-5telad
git subtree split --prefix=repoquest -b repoquest-main

# Sanity check: these files must be at the top level of the new branch
git ls-tree --name-only repoquest-main | grep -E '^(package.json|README.md|LICENSE|src)$'

git push https://github.com/sriyansv/repoquest.git repoquest-main:main
```

If `git subtree split` says the repository is shallow, run `git fetch --unshallow` first.

### 1.3 Verify the published repository builds on its own

```bash
cd ..
git clone https://github.com/sriyansv/repoquest.git repoquest-check
cd repoquest-check
npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

**Expected:** all commands succeed (163 tests passed, 1 skipped). This exact sequence was run on a fresh extraction before publication and passed.

Then on GitHub → **Actions**: the **CI** workflow should run on `main` and pass (green tick). The README badge turns green once it does.

### 1.4 Repository settings
- **About** (gear icon): website = your Vercel URL (after Part 2); topics: `github`, `open-source`, `developer-tools`, `code-visualization`, `good-first-issue`, `beginners`, `nextjs`, `typescript`.
- **Settings → General → Features:** Issues ✓, Discussions ✓ (optional, useful for questions).
- **Settings → Code security:** enable **Private vulnerability reporting** (SECURITY.md relies on it), **Dependabot alerts**, and **Secret scanning** (free for public repos).
- **Settings → Branches:** optionally protect `main` and require the CI check.
- **Labels:** make sure `good first issue` and `help wanted` exist (GitHub creates them by default).

### 1.5 Optional: tidy gemsontop
`gemsontop` doesn't use anything in `repoquest/`. Once the new repo is verified, you can delete the folder from gemsontop, or leave it. That's up to you.

---

## Part 2: Deploy to Vercel (free Hobby plan)

### 2.1 Create a GitHub token for the server
GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate:
- Name `repoquest-production`, expiry of your choice (put a reminder in your calendar)
- Repository access: **Public repositories (read-only)**, no extra permissions.

This raises the shared limit from 60 to 5,000 GitHub API requests per hour. Without it, a public deployment stops working after a handful of visitors. The token is used only on the server and is never sent to browsers.

### 2.2 Import the project
vercel.com → **Add New… → Project** → import `sriyansv/repoquest`.
- Framework preset: **Next.js** (auto-detected). Root directory: `./`. Build and output settings: defaults.
- **Environment variables** (Production):

| Name | Value | Required |
|---|---|---|
| `GITHUB_TOKEN` | the token from 2.1 | **Yes** (for a public site) |
| `NEXT_PUBLIC_REPO_URL` | `https://github.com/sriyansv/repoquest` | No (this is the default) |
| `ANTHROPIC_API_KEY` | only if you want AI explanations and accept the cost | No |
| `AI_MODEL` | e.g. `claude-haiku-5-5` for lower cost | No |

Click **Deploy**.

> Recommendation: **launch without AI.** Every feature except the optional "Explain with AI" buttons works without it. The AI endpoint's rate limit is per server instance, so on a public site a key could be costly. Turn AI on later, deliberately, with a spending limit set in the Anthropic Console.

### 2.3 Set the canonical URL
After the first deploy, copy the production domain (e.g. `https://repoquest.vercel.app` or whatever Vercel assigned), add `NEXT_PUBLIC_SITE_URL` with that value, and **redeploy** (Deployments → ⋯ → Redeploy). Vercel's `VERCEL_PROJECT_PRODUCTION_URL` is used as a fallback, but an explicit value avoids surprises with custom domains.

### 2.4 Verify the deployment

```bash
./scripts/verify-deployment.sh https://<your-domain> pallets/flask
```

It checks the landing page, explorer, guide page, social images, file API, path-traversal rejection, missing-repo handling, the no-JS fallback, robots/sitemap, and that metadata doesn't point at localhost. It also warns if `GITHUB_TOKEN` isn't set. **The deployment counts as live only when this prints "All checks passed."**

Then check by hand in a browser (desktop and phone):
1. Paste a repo URL → Explore. All four tabs load.
2. Architecture: drag, zoom, click a module.
3. Share → paste the link into a private window. The guide page opens.
4. Paste the guide URL into a social-card preview tool, such as the post composer on X or LinkedIn, and check that the image appears.

### 2.5 Add the URL everywhere
- GitHub repo **About** → Website.
- README: add a "**Live:** https://…" line under the tagline (only after 2.4 passes).

---

## Part 3: First release

```bash
git tag -a v0.1.0 -m "RepoQuest 0.1.0"
git push origin v0.1.0
```

GitHub → Releases → **Draft a new release** → tag `v0.1.0` → paste the notes from `docs/LAUNCH.md` → Publish. Or: `gh release create v0.1.0 --title "RepoQuest 0.1.0" --notes-file <notes.md>`.

---

## Operating limits (good to know)

| Limit | Default | Where |
|---|---|---|
| GitHub API | 5,000 req/h with token (60 without), shared by all visitors | GitHub |
| Analyses per IP | 60 per 10 min per server instance | `ANALYSIS_RATE_LIMIT_PER_10_MIN` |
| File previews per IP | 300 per 10 min per server instance | `FILE_RATE_LIMIT_PER_10_MIN` |
| AI explanations per IP | 20 per hour per server instance | `AI_RATE_LIMIT_PER_HOUR` |
| Cache | GitHub responses cached 30 min | `REVALIDATE_SECONDS` in `src/lib/github/client.ts` |
| Function duration | 60 s (pages, social images), 120 s (AI) | `maxDuration` exports, `vercel.json` |

One analysis costs about 6 GitHub API calls on a cache miss, so the token supports roughly 800 *new* repository analyses per hour. Repeat visits within 30 minutes are served from cache.
