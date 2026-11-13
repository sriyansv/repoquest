# Contributing to RepoQuest

Thanks for wanting to help! RepoQuest helps people understand any codebase and
find their way in. Contributions of all sizes are welcome, including bug
reports, docs fixes, analyzer improvements, and UI polish.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before you take part.

## Table of contents

- [Before you start](#before-you-start)
- [Setting up your environment](#setting-up-your-environment)
- [Useful scripts](#useful-scripts)
- [Project layout](#project-layout)
- [Finding your first issue](#finding-your-first-issue)
- [Making a change](#making-a-change)
- [Product principles](#product-principles)
- [Submitting a pull request](#submitting-a-pull-request)

## Before you start

You will need:

* **Node.js 20.9 or newer** (`node -v`)
* **npm** (it comes with Node.js)

An API key is **not** required. RepoQuest works fully without one.

## Setting up your environment

```bash
git clone https://github.com/sriyansv/repoquest
cd repoquest
npm install
cp .env.example .env.local
npm run dev
```

Then open <http://localhost:3000>.

### Optional environment variables

Set these in `.env.local`. You can skip all of them.

| Variable            | What it does                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `GITHUB_TOKEN`      | Raises the GitHub API rate limit from 60 to 5,000 requests per hour.                             |
| `ANTHROPIC_API_KEY` | Enables optional AI explanations using Anthropic models.                                         |
| `AI_PROVIDER=ollama`| Uses a free local model through [Ollama](https://ollama.com) instead of a paid API.              |

Keep secrets server-side. Never give them a `NEXT_PUBLIC_` prefix, and never
commit `.env.local`.

## Useful scripts

| Command                | What it does                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run dev`          | Starts the development server at <http://localhost:3000>.                                              |
| `npm run build`        | Builds the production app.                                                                             |
| `npm run lint`         | Runs ESLint.                                                                                           |
| `npm run typecheck`    | Runs the TypeScript compiler without emitting files.                                                   |
| `npm test`             | Runs the Vitest unit tests in `tests/unit`. These do not use the network.                              |
| `npm run test:live`    | Runs tests against the real GitHub API. These need network access and may hit rate limits.            |
| `npm run demo:build`   | Regenerates `src/data/demo.json`, the demo shown on the landing page. Run it when you change the analyzer. |

## Project layout

```
src/app          Next.js routes and API routes
src/components   UI components; explorer/ holds the four explorer tabs
src/lib/github   GitHub client, URL parsing, and the repository importer
src/lib/analysis Pure analysis code: languages, structure and entry points,
                 import extraction, architecture graph, summary, and issue
                 assessment. No network access, and fully unit-tested.
src/lib/ai       Optional AI provider and prompts
tests/unit       Unit tests
```

For more detail, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Finding your first issue

Look for issues labelled:

* [`good first issue`](https://github.com/sriyansv/repoquest/labels/good%20first%20issue)
* [`help wanted`](https://github.com/sriyansv/repoquest/labels/help%20wanted)

**Comment on the issue before you start.** This tells others you are working on
it, and lets maintainers give you pointers early. If you are stuck or the issue
is unclear, ask in the comments. There are no silly questions.

## Making a change

1. Create a branch from `main` with a short, descriptive name, for example
   `fix/summary-missing-license` or `feat/entry-point-hints`.
2. Keep each pull request small and focused on one thing. Smaller PRs are
   reviewed faster.
3. Add or update tests when you change behavior. **Analyzer changes must come
   with unit tests** in `tests/unit`.
4. If you change the analyzer, run `npm run demo:build` and commit the updated
   `src/data/demo.json`.
5. Before you open a PR, make sure every check passes:

   ```bash
   npm run lint && npm run typecheck && npm test && npm run build
   ```

## Product principles

RepoQuest is only useful if people can trust what it says. Please keep these
principles in mind when you write code, copy, or prompts:

* **Never present a guess as fact.** Label anything inferred as *inferred* and
  anything verified from the code as *confirmed*.
* **Cite sources for summary facts.** Each claim in a repository summary should
  point to the file, and ideally the line, that supports it.
* **Do not call an issue beginner-friendly based on labels alone.** Labels are a
  hint, not a verdict. The issue assessment should explain its reasoning.
* **The app must work without any AI key.** AI explanations are an optional
  extra. Every feature must have a non-AI path.

## Submitting a pull request

* Fill in the pull request template. It asks for a summary, the related issue,
  how you tested the change, and a checklist.
* Link the issue you are fixing with `Closes #123` in the PR description.
* For UI changes, include screenshots or a short recording.
* Be patient and open to feedback. Reviewers may ask for changes. This is a
  normal part of the process and not a judgment of you.

Once your PR is merged, your name is part of RepoQuest's history. Thank you for
making RepoQuest better for everyone!
