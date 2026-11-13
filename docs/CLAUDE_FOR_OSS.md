# Claude for Open Source: honest eligibility assessment

_Assessed 2026-11-13 against the criteria published at <https://claude.com/contact-sales/claude-for-oss>._ Re-check that page before applying, because criteria can change.

## Published criteria (paraphrased from the official page)

The programme offers 6 months of a complimentary Claude subscription to eligible open-source maintainers and contributors. Applicants should fit at least one track:

| Track | Requirement |
|---|---|
| Maintainers and library authors | Packages with **≥ 500 dependent repos**, **≥ 100 dependent packages**, or **≥ 200,000 combined monthly downloads** |
| Core contributors | Listed committer or maintainer on a recognized foundation or language project (CPython, Rust, Node.js TSC, Apache PMC, CNCF, Kubernetes, Linux, Django, Rails…) |
| Active contributors | **≥ 100 pull requests merged** into repos you don't own in the last 12 months |
| Community builders | One of your repos had **≥ 20 unique external contributors with merged PRs** in the last 12 months |
| Critical infrastructure | A repo you maintain has an **OpenSSF criticality score ≥ 0.4** |

The page also says: *"Don't quite fit? If you maintain something the ecosystem quietly depends on, apply anyway and tell us about it."*

## Where things stand today (evidence-based)

| Track | Status | Evidence |
|---|---|---|
| Maintainers / library authors | ❌ Not met | RepoQuest is a web app, not a package. It has no dependents or downloads yet. |
| Core contributors | ❌ Not met | No such role found. |
| Active contributors | ❓ Unknown, likely not met | Not measured. Check with a GitHub search: `is:pr is:merged author:sriyansv -user:sriyansv merged:>YYYY-MM-DD`. |
| Community builders | ❌ Not met | RepoQuest has not been published as its own repository yet, so it has 0 external contributors. |
| Critical infrastructure | ❌ Not met | No OpenSSF score. A new project would score far below 0.4. |

**Conclusion: you are not eligible today under any published track.** Applying now under the "don't quite fit" clause would not be credible either, because nothing depends on RepoQuest yet. That is normal for a project that is one day old, and it is the honest starting point.

## Realistic path (genuine, no stat manipulation)

The most plausible track for RepoQuest is **Community builders (≥ 20 unique external contributors with merged PRs in 12 months)**. The project is designed for it: beginner contributors are its audience, and it ships a contributor guide, issue forms and a roadmap with scoped first issues.

1. Publish `sriyansv/repoquest` and deploy it (see `NEXT_STEPS.md`).
2. Open 10–15 **real** issues from `ROADMAP.md` (language support is naturally one-language-per-PR work).
3. Review PRs quickly and kindly, because first-time contributors return when reviews are fast.
4. Share it where learners are (see `LAUNCH.md`).
5. Track evidence monthly in the table below. Count only **unique external** contributors with **merged** PRs. Never split PRs artificially, merge trivial PRs to inflate counts, or use alt accounts.

Your own **Active contributors** track (100 merged PRs to others' repos in 12 months) is a second, independent path. RepoQuest itself can help you find suitable issues in other projects.

## Evidence log (update as it happens)

| Date | Metric | Value | Source/link |
|---|---|---|---|
| 2026-11-13 | External contributors with merged PRs (12 mo) | 0 | repository not yet public |
| 2026-11-13 | Stars | n/a | repository not yet public |
| | | | |

## Draft application (fill in only true numbers when you apply)

> **GitHub repository:** https://github.com/sriyansv/repoquest
>
> **Reach and impact:** RepoQuest helps beginner developers understand unfamiliar GitHub repositories and make their first contribution. It produces an interactive architecture map built from real import statements (with inferred relationships clearly labelled), source-cited summaries that work without AI, and an issue assessor that checks whether a "good first issue" is actually approachable. Since launching on [DATE], it has had [N] unique external contributors with merged PRs, [N] stars, and [usage evidence, e.g. N analyses/month or projects linking to RepoQuest guides]. [Name any projects or courses that use it, only if true.]
>
> **How I'll use the subscription:** Reviewing and mentoring first-time contributors' PRs; extending the analyzer to more languages (PHP, C#, monorepo resolution); improving the accuracy of explanations; and keeping the grounded-AI path honest with evaluation tests.

Submit only when at least one track's threshold is met, or when you can show concrete ecosystem reliance under the "don't quite fit" clause.
