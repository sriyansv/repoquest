# Next steps

RepoQuest is published (https://github.com/sriyansv/repoquest) and deployed (https://repoquest-seven.vercel.app). These are the remaining actions, in order.

## Owner actions (need your accounts or your identity)

1. **Add `GITHUB_TOKEN` in Vercel (most important).** GitHub → Settings → Developer settings → Fine-grained tokens → *Public repositories (read-only)*, no permissions. Then Vercel → `repoquest` project → Settings → Environment Variables → `GITHUB_TOKEN` (Production, mark Sensitive) → Redeploy. Verify: the explorer sidebar should say `…/5,000 requests left` instead of `(anonymous)`, and `scripts/verify-deployment.sh` should no longer print the warning.
2. **Publish the v0.1.0 release.** The tag `v0.1.0` is pushed. On GitHub → Releases → *Draft a new release* → choose tag `v0.1.0` → paste `docs/RELEASE_NOTES_v0.1.0.md` → Publish. (The build session had no tool that can create GitHub Release objects.)
3. **Repository About:** set Website to `https://repoquest-seven.vercel.app` and topics `github`, `open-source`, `developer-tools`, `code-visualization`, `good-first-issue`, `beginners`, `nextjs`, `typescript`. Enable Private vulnerability reporting, Dependabot alerts and Secret scanning (Settings → Code security).
4. **Launch posts.** Texts are ready in `docs/LAUNCH.md`. Post them yourself, or explicitly authorise posting. Do step 1 first.

## Engineering follow-ups
1. Shared rate limiting (Upstash Redis free tier or Vercel's `@vercel/firewall` SDK) to replace the per-instance counters, which don't hold on serverless. The configured WAF rule did not enforce on Hobby in testing.
2. Starter issues #1–#6.
3. Verify the Anthropic provider with a real key before enabling AI publicly; prefer a small model and a spending limit.
4. HTTP 404 status for invalid repo routes.
5. Optional: privacy-friendly analytics (e.g. Vercel Web Analytics, free tier) so real usage can be measured honestly.
