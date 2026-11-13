# Security Policy

## Supported Versions

RepoQuest is pre-1.0. Security fixes are made on the latest `main` branch and
released as the next `0.x` version.

| Version        | Supported          |
| -------------- | ------------------ |
| latest `main`  | :white_check_mark: |
| latest `0.x`   | :white_check_mark: |
| older `0.x`    | :x:                |

## Reporting a Vulnerability

Please **do not** open a public issue, pull request, or discussion for a
security problem.

Report it privately using GitHub Security Advisories:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Or open the form directly at
   <https://github.com/sriyansv/repoquest/security/advisories/new>.

### What to include

* A description of the issue and its potential impact
* Steps to reproduce, or a proof of concept
* The affected version, commit, or deployment (for example, `localhost` or a
  hosted instance)
* Any suggested fix, if you have one

### Response expectations

These are goals, not guarantees:

* We aim to acknowledge your report within **7 days**.
* We will keep you informed while we investigate and work on a fix.

## Scope Notes

The following areas are especially relevant to RepoQuest. Reports about them
are welcome.

* **API keys are server-side only.** `GITHUB_TOKEN` and `ANTHROPIC_API_KEY`
  must only be read in server code. They must never use the `NEXT_PUBLIC_`
  prefix, because that would expose them to the browser bundle. Any change
  that sends these values to the client is a security issue.
* **Rate limiting on `/api/explain`.** The endpoint has an in-memory,
  per-instance rate limit. This limit is not shared across server instances or
  restarts, so it is a basic guard rather than a complete defense. Reports
  about ways to bypass or exhaust the limit are welcome.
* **AI output rendering.** AI-generated text is displayed with a custom React
  renderer. The app does not use `dangerouslySetInnerHTML` for AI output.
  Reports of model output that could inject markup, scripts, or links into the
  page are in scope.
* **Repository content is untrusted.** Files, READMEs, and other content from
  analyzed repositories are treated as untrusted data in AI prompts. Prompt
  injection attempts that cause the app to leak keys, act outside its task, or
  display misleading output are in scope.

## Out of Scope

* Vulnerabilities in third-party services (GitHub, Anthropic, Ollama) should be
  reported to those vendors.
* Findings that require a user to deliberately paste a malicious token or key
  into their own local instance.
