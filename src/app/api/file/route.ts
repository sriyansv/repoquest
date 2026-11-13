import { NextResponse, type NextRequest } from "next/server";
import { GitHubError } from "@/lib/github/client";
import { fileLimiter, limitError } from "@/lib/github/guard";
import { fetchFileForPreview } from "@/lib/github/repo";
import { isValidOwner, isValidRepoName } from "@/lib/github/url";
import { errorStatus } from "@/lib/http";
import { clientKey } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const owner = sp.get("owner") ?? "";
  const repo = sp.get("repo") ?? "";
  const path = sp.get("path") ?? "";
  if (!isValidOwner(owner) || !isValidRepoName(repo) || !path) {
    return NextResponse.json({ error: "Missing or invalid owner, repo, or path." }, { status: 400 });
  }
  const rl = fileLimiter.check(clientKey(req.headers));
  if (!rl.ok) {
    const e = limitError(rl.retryAfterSec, "opening files");
    return NextResponse.json({ error: e.message, kind: e.kind }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  try {
    const { content, reason } = await fetchFileForPreview(owner, repo, path);
    return NextResponse.json(
      { path, content, reason: reason ?? null },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    const e = err instanceof GitHubError ? err : new GitHubError("network", "Could not load the file.");
    return NextResponse.json({ error: e.message, kind: e.kind }, { status: errorStatus(e) });
  }
}
