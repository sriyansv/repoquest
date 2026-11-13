import { ImageResponse } from "next/og";
import { analyzeRepo } from "@/lib/github/repo";
import { isValidOwner, isValidRepoName } from "@/lib/github/url";

export const alt = "RepoQuest repository map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  let title = `${owner}/${repo}`;
  let headline = "Explore this repository with RepoQuest.";
  let langs: { language: string; color: string; percent: number }[] = [];
  let stats = "";
  if (isValidOwner(owner) && isValidRepoName(repo)) {
    try {
      const a = await analyzeRepo(owner, repo);
      title = a.meta.fullName;
      headline = a.summary.headline.length > 140 ? a.summary.headline.slice(0, 137) + "…" : a.summary.headline;
      langs = a.languages.slice(0, 5);
      stats = `★ ${a.meta.stars.toLocaleString("en-US")}   ·   ${a.totalFiles.toLocaleString("en-US")} files   ·   ${a.graph.nodes.length} modules`;
    } catch {
      /* fall back to generic card */
    }
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0c0f", color: "#e8eaed", padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: "#9aa3b2" }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#5fd4c4" }} />
          RepoQuest
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: title.length > 30 ? 60 : 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 30, color: "#9aa3b2", lineHeight: 1.35 }}>{headline}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {langs.length > 0 && (
            <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: "#1a1f26" }}>
              {langs.map((l) => <div key={l.language} style={{ width: `${l.percent}%`, background: l.color }} />)}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#6b7384" }}>
            <span>{stats}</span>
            <span style={{ color: "#f4b860" }}>Understand any codebase →</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
