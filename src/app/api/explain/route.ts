import { NextResponse, type NextRequest } from "next/server";
import { AIError, getProvider } from "@/lib/ai/provider";
import { buildFilePrompt, buildRepoPrompt, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { fetchRawFile, GitHubError, mapLimit } from "@/lib/github/client";
import { analyzeRepo } from "@/lib/github/repo";
import { isValidOwner, isValidRepoName } from "@/lib/github/url";
import { errorStatus } from "@/lib/http";
import { clientKey, LruCache, RateLimiter } from "@/lib/ratelimit";

const limiter = new RateLimiter(Number(process.env.AI_RATE_LIMIT_PER_HOUR) || 20, 60 * 60 * 1000);
const cache = new LruCache<{ text: string; model: string }>(300);

export async function GET() {
  const p = getProvider();
  return NextResponse.json({ enabled: Boolean(p), provider: p?.id ?? null, model: p?.model ?? null });
}

export async function POST(req: NextRequest) {
  const provider = getProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "AI explanations are not configured on this server. The grounded summary above is generated without AI." },
      { status: 501 },
    );
  }

  let body: { owner?: unknown; repo?: unknown; path?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const owner = typeof body.owner === "string" ? body.owner : "";
  const repo = typeof body.repo === "string" ? body.repo : "";
  const path = typeof body.path === "string" && body.path ? body.path : null;
  if (!isValidOwner(owner) || !isValidRepoName(repo) || (path !== null && path.length > 1000)) {
    return NextResponse.json({ error: "Invalid repository or path." }, { status: 400 });
  }

  try {
    // Re-fetch server-side: we never trust file contents sent by the browser.
    const analysis = await analyzeRepo(owner, repo);
    const key = `${analysis.meta.fullName}@${analysis.tree.length}:${path ?? "*"}:${provider.model}`;
    const hit = cache.get(key);
    if (hit) return NextResponse.json({ ...hit, cached: true });

    const rl = limiter.check(clientKey(req.headers));
    if (!rl.ok) {
      return NextResponse.json(
        { error: `AI explanation limit reached. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    let prompt: string;
    const { owner: o, repo: r } = analysis.meta;
    if (path) {
      if (!analysis.tree.some((e) => e.type === "blob" && e.path === path)) {
        return NextResponse.json({ error: "That file is not in this repository." }, { status: 404 });
      }
      const content = await fetchRawFile(o, r, analysis.ref, path, 200_000);
      if (content === null) return NextResponse.json({ error: "This file is binary or too large to explain." }, { status: 422 });
      prompt = buildFilePrompt(analysis, path, content);
    } else {
      const keyPaths = [
        ...analysis.entryPoints.map((e) => e.path),
        ...analysis.summary.executionFlow.flatMap((s) => s.calls),
        "package.json", "pyproject.toml", "Cargo.toml", "go.mod",
      ].filter((p, i, arr) => arr.indexOf(p) === i && analysis.tree.some((e) => e.path === p)).slice(0, 8);
      const contents = await mapLimit(keyPaths, 6, (p) => fetchRawFile(o, r, analysis.ref, p, 100_000));
      prompt = buildRepoPrompt(
        analysis,
        keyPaths.flatMap((p, i) => (contents[i] ? [{ path: p, content: contents[i]! }] : [])),
      );
    }

    const text = await provider.explain({ system: SYSTEM_PROMPT, prompt, maxTokens: 8000 });
    const result = { text, model: provider.model };
    cache.set(key, result);
    return NextResponse.json({ ...result, cached: false });
  } catch (err) {
    if (err instanceof AIError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof GitHubError) return NextResponse.json({ error: err.message }, { status: errorStatus(err) });
    console.error("explain failed", err);
    return NextResponse.json({ error: "Something went wrong generating the explanation." }, { status: 500 });
  }
}
