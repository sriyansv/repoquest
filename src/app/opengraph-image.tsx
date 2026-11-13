import { ImageResponse } from "next/og";

export const alt = "RepoQuest: understand any codebase";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: "#0a0c0f", color: "#e8eaed", padding: "72px", fontFamily: "sans-serif", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, color: "#9aa3b2" }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#5fd4c4" }} /> RepoQuest
        </div>
        <div style={{ fontSize: 78, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>Understand any codebase.</div>
        <div style={{ fontSize: 78, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, color: "#f4b860" }}>Find your way in.</div>
        <div style={{ fontSize: 34, color: "#9aa3b2", marginTop: 10 }}>Make your first contribution. Free & open source.</div>
      </div>
    ),
    size,
  );
}
