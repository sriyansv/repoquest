import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";

const sans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

const description =
  "RepoQuest maps any public GitHub repository: an interactive file explorer, an architecture diagram built from real imports, beginner-friendly explanations, and help finding your first issue. Free and open source.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "RepoQuest — Understand any codebase",
    template: "%s · RepoQuest",
  },
  description,
  applicationName: "RepoQuest",
  keywords: ["github", "codebase explorer", "open source", "first contribution", "architecture diagram", "good first issue", "code understanding"],
  openGraph: {
    type: "website",
    siteName: "RepoQuest",
    title: "RepoQuest — Understand any codebase. Find your way in.",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "RepoQuest — Understand any codebase",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0c0f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable} antialiased`}>
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-amber focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
