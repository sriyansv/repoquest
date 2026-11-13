"use client";

import { useState } from "react";
import { IconCheck, IconShare } from "../icons";

export function ShareButton({ path, label = "Share" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url, title: document.title });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-lg bg-amber px-3 py-2 text-sm font-medium text-ink hover:bg-amber-2"
    >
      {copied ? <IconCheck /> : <IconShare />}
      <span aria-live="polite">{copied ? "Link copied" : label}</span>
    </button>
  );
}
