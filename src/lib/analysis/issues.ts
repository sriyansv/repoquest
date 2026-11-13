import type { IssueAssessment, TreeEntry } from "../types";
import { isIgnoredPath, moduleOf } from "./structure";

export interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  body: string | null;
  labels: (string | { name?: string })[];
  user: { login: string } | null;
  comments: number;
  created_at: string;
  updated_at: string;
  assignee: unknown;
  assignees?: unknown[];
  pull_request?: unknown;
  state: string;
  locked?: boolean;
}

const BEGINNER_LABEL = /good[\s-_]*first[\s-_]*(issue|bug|task|contribution)?|first[\s-_]*timers?[\s-_]*only|beginner|starter|easy|newcomer|low[\s-_]*hanging|e-easy|difficulty[:/\s-]*(low|easy)/i;
const HELP_LABEL = /help[\s-_]*wanted|up[\s-_]*for[\s-_]*grabs|contributions?[\s-_]*welcome|hacktoberfest/i;
const DOCS_LABEL = /^(docs?|documentation|typo)$|documentation/i;
const HARD_LABEL = /breaking|security|needs[\s-_]*(design|discussion|decision|triage|investigation)|blocked|rfc|wontfix|won't fix|duplicate|invalid|question|epic|meta|on[\s-_]*hold|stale/i;
const HARD_WORDS = /\b(refactor(ing)? the (entire|whole)|rewrite|architecture|race condition|memory leak|deadlock|performance regression|security vulnerabilit|breaking change|migrat(e|ion) (to|from))\b/i;
const CLAIMED = /\b(i(['’]m| am) working on|i(['’]ll| will) (take|work on|pick|submit a pr)|assigned to me|pr (is )?(open|incoming|in progress))\b/i;

const STOPWORDS = new Set(
  "a an and are as at be but by can could do does for from has have how i if in into is it its make may more not of on or should so some than that the their then there these this to up use using was we what when where which while who why will with would you your add fix bug issue error support update new feature docs file files when allow".split(" "),
);

function labelNames(issue: GitHubIssue): string[] {
  return issue.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")).filter(Boolean);
}

export function excerpt(body: string, max = 280): string {
  const t = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, " [code] ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\((?:[^()]|\([^()]*\))*\)/g, "$1")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : t;
}

/** Files explicitly named in the issue text that exist in the repository. */
export function mentionedFiles(text: string, files: string[]): string[] {
  const hits = new Set<string>();
  const candidates = text.match(/[\w@.-]+(?:\/[\w@.-]+)*\.[a-zA-Z]{1,6}\b|(?:[\w@.-]+\/)+[\w@.-]+/g) ?? [];
  for (const raw of candidates) {
    const c = raw.replace(/^\.?\//, "").replace(/[.,:;)]+$/, "");
    if (c.length < 4) continue;
    if (files.includes(c)) {
      hits.add(c);
      continue;
    }
    // Suffix match ("Button.tsx" → "src/components/Button.tsx"); only if unambiguous.
    if (c.includes(".")) {
      const matches = files.filter((f) => f === c || f.endsWith("/" + c));
      if (matches.length === 1) hits.add(matches[0]);
    }
  }
  return [...hits].slice(0, 6);
}

/** Files whose name matches distinctive words from the issue title. Labelled as a keyword guess. */
export function keywordFiles(title: string, files: string[], exclude: Set<string>): string[] {
  const words = title
    .toLowerCase()
    .replace(/[`'"]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  if (!words.length) return [];
  const scored: { f: string; s: number }[] = [];
  for (const f of files) {
    if (exclude.has(f)) continue;
    const base = (f.split("/").pop() ?? "").toLowerCase().replace(/\.[^.]+$/, "");
    const tokens = new Set(base.split(/[^a-z0-9]+|(?=[A-Z])/).concat(base));
    let s = 0;
    for (const w of words) if (tokens.has(w) || base === w || (w.length >= 5 && base.includes(w))) s += 2;
    if (s) {
      if (/test|spec|__tests__|fixtures?|\.d\.ts$/.test(f)) s -= 1;
      scored.push({ f, s });
    }
  }
  return scored.sort((a, b) => b.s - a.s || a.f.length - b.f.length).slice(0, 3).map((x) => x.f);
}

export function assessIssue(
  issue: GitHubIssue,
  tree: TreeEntry[],
  ctx: { contributingPath: string | null; testCommand: string | null; primaryLanguage: string | null },
  now = Date.now(),
): IssueAssessment {
  const labels = labelNames(issue);
  const body = issue.body ?? "";
  const text = `${issue.title}\n${body}`;
  const files = tree.filter((e) => e.type === "blob" && !isIgnoredPath(e.path)).map((e) => e.path);
  const reasons: IssueAssessment["reasons"] = [];
  let score = 0;

  const beginnerLabel = labels.find((l) => BEGINNER_LABEL.test(l));
  const helpLabel = labels.find((l) => HELP_LABEL.test(l));
  const docsLabel = labels.find((l) => DOCS_LABEL.test(l));
  const hardLabel = labels.find((l) => HARD_LABEL.test(l));

  if (beginnerLabel) { score += 3; reasons.push({ positive: true, text: `Maintainers labelled it “${beginnerLabel}”.` }); }
  if (helpLabel) { score += 1; reasons.push({ positive: true, text: `Labelled “${helpLabel}”, so outside help is welcome.` }); }
  if (docsLabel) { score += 1; reasons.push({ positive: true, text: "Documentation work is usually a gentle first contribution." }); }
  if (hardLabel) { score -= 3; reasons.push({ positive: false, text: `Labelled “${hardLabel}”, which usually means it needs maintainer decisions first.` }); }

  // Content checks - we never trust the label alone.
  const plainLen = body.replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, " ").trim().length;
  if (plainLen < 60) {
    score -= 2;
    reasons.push({ positive: false, text: "The description is very short, so the expected change is unclear." });
  } else if (plainLen >= 200) {
    score += 1;
    reasons.push({ positive: true, text: "Has a detailed description." });
  }
  if (/- \[ \]|acceptance criteria|expected (behavio(u)?r|result)|steps to reproduce|to reproduce|proposed (solution|fix)|what needs to be done|todo:/i.test(body)) {
    score += 1;
    reasons.push({ positive: true, text: "Describes expected behaviour, steps, or a task list." });
  }
  if (HARD_WORDS.test(text)) {
    score -= 2;
    reasons.push({ positive: false, text: "Mentions deeper work (e.g. refactoring, performance, or migrations)." });
  }

  const assigned = Boolean(issue.assignee) || Boolean(issue.assignees?.length);
  if (assigned) { score -= 3; reasons.push({ positive: false, text: "Someone is already assigned." }); }
  if (CLAIMED.test(body)) { score -= 1; reasons.push({ positive: false, text: "The description suggests someone may already be working on it." }); }
  if (issue.locked) { score -= 3; reasons.push({ positive: false, text: "The conversation is locked." }); }
  if (issue.comments > 15) { score -= 1; reasons.push({ positive: false, text: `Long discussion (${issue.comments} comments) — read it before starting.` }); }

  const ageDays = (now - new Date(issue.updated_at).getTime()) / 86_400_000;
  if (ageDays > 365) { score -= 1; reasons.push({ positive: false, text: "No activity for over a year; check it is still wanted." }); }

  const mentioned = mentionedFiles(text, files);
  if (mentioned.length) { score += 1; reasons.push({ positive: true, text: "Points to specific files in the codebase." }); }
  const keyword = keywordFiles(issue.title, files, new Set(mentioned));

  // Verdict: "good-first" requires BOTH a positive signal and a usable description, and no blockers.
  const blockers = assigned || Boolean(hardLabel) || Boolean(issue.locked);
  const hasSignal = Boolean(beginnerLabel || docsLabel || helpLabel);
  const verdict: IssueAssessment["verdict"] =
    !blockers && hasSignal && plainLen >= 60 && score >= 3 ? "good-first" : !blockers && score >= 1 ? "possible" : "not-recommended";

  const prerequisites: string[] = [];
  const relevant = [...mentioned, ...keyword];
  const mods = [...new Set(relevant.map(moduleOf))].slice(0, 2);
  if (mods.length) prerequisites.push(`Read through ${mods.map((m) => (m === "(root)" ? "the root files" : `\`${m}/\``)).join(" and ")} first.`);
  if (ctx.contributingPath) prerequisites.push(`Follow the project's contribution guide in \`${ctx.contributingPath}\`.`);
  if (ctx.testCommand) prerequisites.push(`Run the tests with \`${ctx.testCommand}\` before and after your change.`);
  if (ctx.primaryLanguage) prerequisites.push(`Basic familiarity with ${ctx.primaryLanguage}.`);
  if (issue.comments > 0) prerequisites.push(`Read the ${issue.comments} existing comment${issue.comments === 1 ? "" : "s"} on the issue.`);
  prerequisites.push("Comment on the issue to say you'd like to work on it before opening a pull request.");

  return {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    labels,
    author: issue.user?.login ?? null,
    comments: issue.comments,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    assigned,
    bodyExcerpt: excerpt(body),
    score,
    verdict,
    reasons,
    relevantFiles: [
      ...mentioned.map((path) => ({ path, evidence: "mentioned" as const })),
      ...keyword.map((path) => ({ path, evidence: "keyword" as const })),
    ],
    prerequisites,
  };
}

export function rankIssues(
  issues: GitHubIssue[],
  tree: TreeEntry[],
  ctx: { contributingPath: string | null; testCommand: string | null; primaryLanguage: string | null },
  limit = 12,
): IssueAssessment[] {
  const seen = new Set<number>();
  const order = { "good-first": 0, possible: 1, "not-recommended": 2 } as const;
  return issues
    .filter((i) => !i.pull_request && i.state === "open" && !seen.has(i.number) && seen.add(i.number))
    .map((i) => assessIssue(i, tree, ctx))
    .sort((a, b) => order[a.verdict] - order[b.verdict] || b.score - a.score || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
