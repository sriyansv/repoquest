import { describe, it, expect } from "vitest";
import { parseRepoInput } from "@/lib/github/url";

const ok = (s: string) => {
  const r = parseRepoInput(s);
  if (!r.ok) throw new Error(`expected ok for ${s}: ${r.error}`);
  return r.ref;
};

describe("parseRepoInput accepts", () => {
  it.each([
    ["https://github.com/vercel/next.js", "vercel", "next.js"],
    ["https://www.github.com/vercel/next.js", "vercel", "next.js"],
    ["http://github.com/o/r", "o", "r"],
    ["https://github.com/o/r/", "o", "r"],
    ["https://github.com/o/r/tree/main/src/x", "o", "r"],
    ["https://github.com/o/r/issues/12", "o", "r"],
    ["https://github.com/o/r.git", "o", "r"],
    ["git@github.com:o/r.git", "o", "r"],
    ["owner/repo", "owner", "repo"],
    ["owner/repo/", "owner", "repo"],
    ["github.com/o/r", "o", "r"],
    ["  https://github.com/o/r  ", "o", "r"],
    ["HTTPS://GitHub.com/O/R", "O", "R"],
    ["https://github.com/o/r?tab=readme#top", "o", "r"],
    ["https://github.com/o/my_repo.name-x", "o", "my_repo.name-x"],
  ])("%s", (input, owner, repo) => {
    expect(ok(input)).toEqual({ owner, repo });
  });
});

describe("parseRepoInput rejects", () => {
  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["gitlab", "https://gitlab.com/o/r"],
    ["only owner", "https://github.com/onlyowner"],
    ["reserved settings", "https://github.com/settings/profile"],
    ["reserved orgs", "orgs/foo"],
    ["invalid chars owner", "https://github.com/o$/r"],
    ["invalid chars repo", "https://github.com/o/r%20x"],
    ["dotdot repo", "https://github.com/o/.."],
    ["dot repo", "https://github.com/o/."],
    ["javascript scheme", "javascript:alert(1)"],
    ["ftp scheme", "ftp://github.com/o/r"],
    ["leading hyphen", "https://github.com/-bad/r"],
    ["double hyphen", "https://github.com/a--b/r"],
    ["too long", "https://github.com/o/" + "r".repeat(300)],
    ["owner too long", "https://github.com/" + "a".repeat(40) + "/r"],
    ["ssh other host", "git@gitlab.com:o/r.git"],
    ["lookalike host", "https://github.com.evil.com/o/r"],
  ])("%s", (_n, input) => {
    const r = parseRepoInput(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });
});
