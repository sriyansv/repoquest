import { describe, it, expect } from "vitest";
import { assessIssue, rankIssues, mentionedFiles } from "@/lib/analysis/issues";
import { issue, tree, NOW, longBody } from "./fixtures";

const t = tree(["src/lib/a.ts", "src/lib/b.ts", "src/ui/Button.tsx", "src/other/Button.tsx", "src/ui/Card.tsx", "README.md"]);
const ctx = { contributingPath: null as string | null, testCommand: null as string | null, primaryLanguage: null as string | null };

describe("assessIssue verdict", () => {
  it("good first issue + detailed body + unassigned → good-first", () => {
    const a = assessIssue(issue({ labels: ["good first issue"] }), t, ctx, NOW);
    expect(a.verdict).toBe("good-first");
    expect(a.assigned).toBe(false);
  });
  it("accepts label objects", () => {
    expect(assessIssue(issue({ labels: [{ name: "Good First Issue" }] }), t, ctx, NOW).verdict).toBe("good-first");
  });
  it.each([["empty", ""], ["short", "please fix"], ["null", null]])("good-first label with %s body is NOT good-first", (_n, body) => {
    const a = assessIssue(issue({ labels: ["good first issue"], body: body as string | null }), t, ctx, NOW);
    expect(a.verdict).not.toBe("good-first");
    expect(a.reasons.some((r) => !r.positive && /short/i.test(r.text))).toBe(true);
  });
  it("HTML comments in body do not count as content", () => {
    const body = "<!-- " + "describe the problem here ".repeat(10) + " -->";
    expect(assessIssue(issue({ labels: ["good first issue"], body }), t, ctx, NOW).verdict).not.toBe("good-first");
  });
  it("assigned → not-recommended", () => {
    const a = assessIssue(issue({ labels: ["good first issue"], assignee: { login: "x" } }), t, ctx, NOW);
    expect(a.verdict).toBe("not-recommended");
    expect(a.assigned).toBe(true);
  });
  it("assignees array also counts", () => {
    expect(assessIssue(issue({ labels: ["good first issue"], assignees: [{}] }), t, ctx, NOW).verdict).toBe("not-recommended");
  });
  it("needs discussion label blocks", () => {
    const a = assessIssue(issue({ labels: ["good first issue", "needs discussion"] }), t, ctx, NOW);
    expect(a.verdict).not.toBe("good-first");
  });
  it("locked issue is not good-first", () => {
    expect(assessIssue(issue({ labels: ["good first issue"], locked: true }), t, ctx, NOW).verdict).toBe("not-recommended");
  });
  it("unlabelled detailed issue can't be good-first", () => {
    expect(assessIssue(issue({ labels: [] }), t, ctx, NOW).verdict).not.toBe("good-first");
  });
});

describe("assessIssue details", () => {
  it("prerequisites include contributing guide and test command", () => {
    const a = assessIssue(issue({ labels: ["good first issue"] }), t, { contributingPath: "CONTRIBUTING.md", testCommand: "npm test", primaryLanguage: "TypeScript" }, NOW);
    expect(a.prerequisites.join("\n")).toContain("CONTRIBUTING.md");
    expect(a.prerequisites.join("\n")).toContain("npm test");
    expect(a.prerequisites.join("\n")).toContain("TypeScript");
  });
  it("omits contributing guide when absent", () => {
    const a = assessIssue(issue(), t, ctx, NOW);
    expect(a.prerequisites.join("\n")).not.toMatch(/contribution guide/);
  });
  it("relevantFiles are tagged by evidence", () => {
    const a = assessIssue(issue({ title: "Card layout broken", body: longBody }), t, ctx, NOW);
    expect(a.relevantFiles).toContainEqual({ path: "src/lib/a.ts", evidence: "mentioned" });
    expect(a.relevantFiles).toContainEqual({ path: "src/ui/Card.tsx", evidence: "keyword" });
  });
  it("stale issue gets a negative reason", () => {
    const a = assessIssue(issue({ updated_at: "2024-01-01T00:00:00Z" }), t, ctx, NOW);
    expect(a.reasons.some((r) => /over a year/.test(r.text))).toBe(true);
  });
});

describe("mentionedFiles", () => {
  const files = ["src/lib/a.ts", "src/ui/Button.tsx", "src/other/Button.tsx", "src/ui/Card.tsx"];
  it("finds exact paths", () => {
    expect(mentionedFiles("Bug in src/lib/a.ts, see.", files)).toEqual(["src/lib/a.ts"]);
  });
  it("finds unambiguous suffix matches", () => {
    expect(mentionedFiles("Update Card.tsx please", files)).toEqual(["src/ui/Card.tsx"]);
  });
  it("skips ambiguous suffix matches", () => {
    expect(mentionedFiles("Fix Button.tsx", files)).toEqual([]);
  });
  it("ignores nonexistent files", () => {
    expect(mentionedFiles("see src/nope.ts and foo.bar", files)).toEqual([]);
  });
});

describe("rankIssues", () => {
  it("filters PRs, closed, and duplicates; sorts good-first first", () => {
    const issues = [
      issue({ number: 5, labels: [], body: "x" }),
      issue({ number: 1, labels: ["good first issue"] }),
      issue({ number: 1, labels: ["good first issue"] }),
      issue({ number: 2, labels: ["good first issue"], pull_request: {} }),
      issue({ number: 3, labels: ["good first issue"], state: "closed" }),
    ];
    const r = rankIssues(issues, t, ctx);
    expect(r.map((x) => x.number)).toEqual([1, 5]);
    expect(r[0].verdict).toBe("good-first");
  });
  it("respects limit", () => {
    const issues = Array.from({ length: 20 }, (_, i) => issue({ number: i + 1 }));
    expect(rankIssues(issues, t, ctx, 5)).toHaveLength(5);
  });
});
