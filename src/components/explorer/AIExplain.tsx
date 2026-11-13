"use client";

import { useState } from "react";
import { SafeMarkdown } from "../SafeMarkdown";
import { IconSpark } from "../icons";
import type { AIStatus } from "./Explorer";

type State = { status: "idle" } | { status: "loading" } | { status: "done"; text: string; model: string } | { status: "error"; message: string };

export function AIExplain({
  owner, repo, path, ai, onPath, label,
}: { owner: string; repo: string; path?: string; ai: AIStatus; onPath?: (p: string) => void; label?: string }) {
  const [state, setState] = useState<State>({ status: "idle" });

  if (!ai.enabled) {
    return (
      <p className="rounded-lg border border-dashed border-line-2 px-3 py-2.5 text-sm text-faint">
        <IconSpark className="mr-1.5 inline text-faint" />
        AI explanations are off on this server. Everything else on this page is generated from the repository without AI. Self-hosters can enable it with an{" "}
        <code className="font-mono text-[12px]">ANTHROPIC_API_KEY</code> or a local Ollama model.
      </p>
    );
  }

  async function run() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, path }),
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; model?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? `Request failed (${res.status}).`);
      setState({ status: "done", text: data.text, model: data.model ?? "AI" });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  if (state.status === "done") {
    return (
      <div className="animate-fade rounded-lg border border-violet/25 bg-violet/[0.04] p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider text-violet">
          <IconSpark /> AI explanation · {state.model}
        </p>
        <SafeMarkdown text={state.text} onPath={onPath} />
        <p className="mt-3 border-t border-line pt-2 text-xs text-faint">
          Generated only from files fetched from this repository. AI can still make mistakes — check claims against the source.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={state.status === "loading"}
        className="inline-flex items-center gap-2 rounded-lg border border-violet/40 bg-violet/10 px-3 py-2 text-sm text-violet transition hover:bg-violet/15 disabled:cursor-wait disabled:opacity-70"
      >
        <IconSpark className={state.status === "loading" ? "animate-spin" : ""} />
        {state.status === "loading" ? "Reading the code…" : label ?? "Explain with AI"}
      </button>
      {state.status === "error" && <p role="alert" className="mt-2 text-sm text-rose">{state.message}</p>}
    </div>
  );
}
