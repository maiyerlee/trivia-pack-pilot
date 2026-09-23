import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, generateText, type LanguageModel } from "ai";

// Single config point for the AI provider. Designed to be copied verbatim into
// merit-appeal-gateway-dev, whose current adapter exposes the same names
// (aiConfig / isAiConfigured / aiChat) but only speaks OpenAI-compatible.
//
// AI_PROVIDER selects the backend:
//   openai-compatible (default)  AI_BASE_URL + AI_API_KEY (Lovable gateway, Ollama, OpenAI, ...)
//   bedrock                      AWS_REGION + AWS_BEARER_TOKEN_BEDROCK (or IAM access keys)
//
// Env is read inside functions, never at module scope: on Cloudflare Workers
// (Lovable's runtime) env binds at request time and module-scope reads are undefined.

export type AiProviderName = "openai-compatible" | "bedrock";

export interface AiConfig {
  provider: AiProviderName;
  model: string;
  /** openai-compatible only */
  baseURL: string;
  /** openai-compatible only */
  apiKey: string;
  /** bedrock only */
  region: string;
  /** bedrock only: Bedrock API key (bearer). Takes precedence over access keys. */
  bearerToken: string;
  /** bedrock only: IAM access key pair, used when no bearer token is set. */
  accessKeyId: string;
  secretAccessKey: string;
  /** bedrock only: optional Guardrail attached to every call. */
  guardrailId: string | undefined;
  guardrailVersion: string;
}

const DEFAULT_OPENAI_COMPATIBLE_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const DEFAULT_OPENAI_COMPATIBLE_MODEL = "google/gemini-2.5-flash";
const DEFAULT_BEDROCK_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const DEFAULT_BEDROCK_REGION = "us-east-1";

function env(name: string): string {
  return process.env[name] ?? "";
}

export function aiConfig(): AiConfig {
  const provider: AiProviderName =
    env("AI_PROVIDER") === "bedrock" ? "bedrock" : "openai-compatible";
  const guardrailId = env("BEDROCK_GUARDRAIL_ID");
  return {
    provider,
    model:
      env("AI_MODEL") ||
      (provider === "bedrock" ? DEFAULT_BEDROCK_MODEL : DEFAULT_OPENAI_COMPATIBLE_MODEL),
    baseURL: env("AI_BASE_URL") || DEFAULT_OPENAI_COMPATIBLE_BASE_URL,
    // Fall back to LOVABLE_API_KEY so an existing Lovable setup needs no change.
    apiKey: env("AI_API_KEY") || env("LOVABLE_API_KEY"),
    region: env("AWS_REGION") || DEFAULT_BEDROCK_REGION,
    bearerToken: env("AWS_BEARER_TOKEN_BEDROCK"),
    accessKeyId: env("AWS_ACCESS_KEY_ID"),
    secretAccessKey: env("AWS_SECRET_ACCESS_KEY"),
    guardrailId: guardrailId || undefined,
    guardrailVersion: env("BEDROCK_GUARDRAIL_VERSION") || "DRAFT",
  };
}

export function isAiConfigured(): boolean {
  const cfg = aiConfig();
  if (cfg.provider === "bedrock") {
    return (
      cfg.bearerToken.length > 0 || (cfg.accessKeyId.length > 0 && cfg.secretAccessKey.length > 0)
    );
  }
  return cfg.apiKey.length > 0;
}

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI is not configured. Set AI_PROVIDER=bedrock with AWS_BEARER_TOKEN_BEDROCK (or AWS access keys), " +
  "or AI_API_KEY for an OpenAI-compatible endpoint. See .env.example.";

// ── Bedrock guardrail injection ─────────────────────────────────────────────
//
// @ai-sdk/amazon-bedrock v4 has no first-class guardrailConfig option, but the
// Converse API accepts it as a top-level body field. Adding it in a fetch wrapper
// keeps the provider untouched. This is only safe with bearer-token auth: with
// SigV4 the provider signs the body *before* calling our fetch, so mutating it
// here would invalidate the signature. In that mode the guardrail is skipped and
// a warning is logged once per request.
const CONVERSE_URL = /\/converse(-stream)?$/;

function withGuardrail(guardrail: { id: string; version: string }): typeof globalThis.fetch {
  return async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (init?.body && typeof init.body === "string" && CONVERSE_URL.test(url)) {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      body["guardrailConfig"] = {
        guardrailIdentifier: guardrail.id,
        guardrailVersion: guardrail.version,
        trace: "enabled",
      };
      init = { ...init, body: JSON.stringify(body) };
    }
    return fetch(input, init);
  };
}

/** True when a guardrail is configured AND the auth mode allows injecting it. */
export function guardrailActive(cfg: AiConfig = aiConfig()): boolean {
  return cfg.provider === "bedrock" && Boolean(cfg.guardrailId) && cfg.bearerToken.length > 0;
}

// ── Model factory ───────────────────────────────────────────────────────────

export function aiModel(cfg: AiConfig = aiConfig()): LanguageModel {
  if (cfg.provider === "bedrock") {
    if (cfg.guardrailId && !cfg.bearerToken) {
      console.warn(
        "[ai] BEDROCK_GUARDRAIL_ID is set but auth is SigV4 (access keys); guardrail injection " +
          "requires AWS_BEARER_TOKEN_BEDROCK. Calls will run WITHOUT the guardrail.",
      );
    }
    const bedrock = createAmazonBedrock({
      region: cfg.region,
      ...(cfg.bearerToken
        ? { apiKey: cfg.bearerToken }
        : { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey }),
      ...(guardrailActive(cfg) && cfg.guardrailId
        ? { fetch: withGuardrail({ id: cfg.guardrailId, version: cfg.guardrailVersion }) }
        : {}),
    });
    return bedrock(cfg.model);
  }
  const provider = createOpenAICompatible({
    name: "ai-provider",
    baseURL: cfg.baseURL,
    apiKey: cfg.apiKey,
  });
  return provider(cfg.model);
}

// ── One-shot chat ───────────────────────────────────────────────────────────

export interface AiChatResult {
  content: string;
  provider: AiProviderName;
  model: string;
  latencyMs: number;
  usage: { inputTokens: number | undefined; outputTokens: number | undefined };
  /** Bedrock guardrail trace when a guardrail ran; undefined otherwise. */
  guardrailTrace: unknown;
}

export async function aiChat({
  system,
  user,
  maxTokens,
  temperature,
}: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<AiChatResult> {
  const cfg = aiConfig();
  if (!isAiConfigured()) throw new Error(AI_NOT_CONFIGURED_MESSAGE);

  const started = Date.now();
  try {
    const result = await generateText({
      model: aiModel(cfg),
      system,
      prompt: user,
      ...(maxTokens !== undefined && { maxOutputTokens: maxTokens }),
      ...(temperature !== undefined && { temperature }),
    });
    const content = result.text.trim();
    if (!content) throw new Error("AI returned an empty response.");
    const bedrockMeta = result.providerMetadata?.["bedrock"] as { trace?: unknown } | undefined;
    return {
      content,
      provider: cfg.provider,
      model: cfg.model,
      latencyMs: Date.now() - started,
      usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens },
      guardrailTrace: bedrockMeta?.trace,
    };
  } catch (err) {
    throw normalizeAiError(err);
  }
}

function normalizeAiError(err: unknown): Error {
  if (APICallError.isInstance(err)) {
    const body = typeof err.responseBody === "string" ? err.responseBody : "";
    if (err.statusCode === 429 || /ThrottlingException/.test(body)) {
      return new Error("Rate limit reached. Please try again in a moment.");
    }
    return new Error(`AI request failed (${err.statusCode ?? "?"}): ${body.slice(0, 200)}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}
