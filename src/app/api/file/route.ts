import { NextResponse, type NextRequest } from "next/server";
import { GitHubError } from "@/lib/github/client";
import { fetchFileForPreview } from "@/lib/github/repo";
import { isValidOwner, isValidRepoName } from "@/lib/github/url";
import { errorStatus } from "@/lib/http";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const owner = sp.get("owner") ?? "";
  const repo = sp.get("repo") ?? "";
  const path = sp.get("path") ?? "";
  if (!isValidOwner(owner) || !isValidRepoName(repo) || !path) {
    return NextResponse.json({ error: "Missing or invalid owner, repo, or path." }, { status: 400 });
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
