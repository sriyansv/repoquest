/** Canonical site URL, used for metadata, sitemaps and share links. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL?.trim() || "https://github.com/sriyansv/repoquest";
