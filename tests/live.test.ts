import { describe, expect, it } from "vitest";
import { analyzeRepo } from "@/lib/github/repo";

// Hits the real GitHub API. Run with: LIVE=1 npx vitest run tests/live.test.ts
const live = process.env.LIVE === "1" ? describe : describe.skip;

live("live GitHub analysis", () => {
  it("analyzes a real public repository", async () => {
    const owner = process.env.LIVE_OWNER ?? "sriyansv";
    const repo = process.env.LIVE_REPO ?? "gemsontop";
    const a = await analyzeRepo(owner, repo);
    expect(a.meta.fullName.toLowerCase()).toBe(`${owner}/${repo}`.toLowerCase());
    expect(a.tree.length).toBeGreaterThan(0);
    if (process.env.LIVE_DUMP) (await import("node:fs")).writeFileSync(process.env.LIVE_DUMP, JSON.stringify(a, null, 2));
  }, 60_000);
});
