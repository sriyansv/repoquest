import { NextResponse, type NextRequest } from "next/server";
import { parseRepoInput, repoPath } from "@/lib/github/url";

/** No-JavaScript fallback for the search form: /go?url=github.com/owner/repo */
export function GET(req: NextRequest) {
  const parsed = parseRepoInput(req.nextUrl.searchParams.get("url") ?? "");
  const target = new URL(parsed.ok ? repoPath(parsed.ref) : "/", req.nextUrl.origin);
  if (!parsed.ok) target.searchParams.set("error", parsed.error);
  return NextResponse.redirect(target, 303);
}
