import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * AI provider abstraction. RepoQuest works fully without AI; this only powers
 * the optional "Explain with AI" buttons.
 *
 * Configuration (server-side environment variables only - never NEXT_PUBLIC_):
 *   AI_PROVIDER        "anthropic" | "ollama" | "none"   (default: anthropic if ANTHROPIC_API_KEY is set, else none)
 *   ANTHROPIC_API_KEY  Claude API key
 *   AI_MODEL           model id (default: claude-opus-5-5 for anthropic, llama3.1 for ollama)
 *   OLLAMA_BASE_URL    default http://localhost:11434 (free, local)
 */

export interface ExplainRequest {
  system: string;
  prompt: string;
  maxTokens: number;
}

export interface AIProvider {
  id: "anthropic" | "ollama";
  model: string;
  explain(req: ExplainRequest): Promise<string>;
}

export class AIError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
    this.name = "AIError";
  }
}

const FALLBACK_ELIGIBLE = /^claude-(opus-5-5|opus-5|sonnet-5-5|fable-5-[12])$/;

function anthropicProvider(apiKey: string, model: string): AIProvider {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 90_000 });
  return {
    id: "anthropic",
    model,
    async explain({ system, prompt, maxTokens }) {
      try {
        const params = {
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user" as const, content: prompt }],
        };
        // Server-side refusal fallback on models that support it (see Anthropic docs).
        const response = FALLBACK_ELIGIBLE.test(model)
          ? await client.beta.messages.create({
              ...params,
              output_config: { effort: "medium" },
              betas: ["server-side-fallback-2026-07-01"],
              fallbacks: "default",
            })
          : await client.messages.create(params);
        if (response.stop_reason === "refusal") throw new AIError("The AI model declined to answer this request.", 422);
        const text = response.content
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("")
          .trim();
        if (!text) throw new AIError("The AI model returned an empty answer.");
        return text;
      } catch (err) {
        if (err instanceof AIError) throw err;
        if (err instanceof Anthropic.AuthenticationError) throw new AIError("The server's AI credentials are invalid.", 503);
        if (err instanceof Anthropic.RateLimitError) throw new AIError("The AI provider is rate limiting requests. Try again shortly.", 429);
        if (err instanceof Anthropic.BadRequestError) throw new AIError("The AI request was rejected (input may be too large).", 400);
        if (err instanceof Anthropic.APIError) throw new AIError(`The AI provider returned an error (${err.status ?? "unknown"}).`);
        throw new AIError("Could not reach the AI provider.");
      }
    },
  };
}

function ollamaProvider(baseUrl: string, model: string): AIProvider {
  return {
    id: "ollama",
    model,
    async explain({ system, prompt }) {
      let res: Response;
      try {
        res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, stream: false, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }),
          signal: AbortSignal.timeout(180_000),
        });
      } catch {
        throw new AIError("Could not reach the local Ollama server.");
      }
      if (!res.ok) throw new AIError(`Ollama returned an error (${res.status}).`);
      const data = (await res.json()) as { message?: { content?: string } };
      const text = data.message?.content?.trim();
      if (!text) throw new AIError("The local model returned an empty answer.");
      return text;
    },
  };
}

export function getProvider(env: NodeJS.ProcessEnv = process.env): AIProvider | null {
  const choice = (env.AI_PROVIDER ?? "").trim().toLowerCase();
  if (choice === "none") return null;
  if (choice === "ollama") {
    return ollamaProvider(env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434", env.AI_MODEL?.trim() || "llama3.1");
  }
  const key = env.ANTHROPIC_API_KEY?.trim();
  if (key && (choice === "" || choice === "anthropic")) {
    return anthropicProvider(key, env.AI_MODEL?.trim() || "claude-opus-5-5");
  }
  return null;
}

export function aiStatus(env: NodeJS.ProcessEnv = process.env): { enabled: boolean; provider: string | null } {
  const p = getProvider(env);
  return { enabled: Boolean(p), provider: p ? `${p.id}` : null };
}
