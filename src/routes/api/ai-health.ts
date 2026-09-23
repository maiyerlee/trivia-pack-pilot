import { createFileRoute } from "@tanstack/react-router";
import { aiChat, aiConfig, guardrailActive, isAiConfigured } from "@/lib/ai-gateway.server";

// GET /api/ai-health — proves the deployed runtime can reach the configured LLM
// provider. Exists for the Bedrock spike; safe to leave in place because it is
// inert (404) unless AI_HEALTH_SECRET is set, and requires that secret in the
// `x-ai-health` header. Never echoes credentials.

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/** Constant-time string compare; avoids leaking the secret length-by-length. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/ai-health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["AI_HEALTH_SECRET"];
        if (!secret) return new Response("Not found", { status: 404 });
        if (!safeEqual(request.headers.get("x-ai-health") ?? "", secret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const cfg = aiConfig();
        const summary = {
          provider: cfg.provider,
          model: cfg.model,
          region: cfg.provider === "bedrock" ? cfg.region : null,
          auth:
            cfg.provider === "bedrock"
              ? cfg.bearerToken
                ? "bearer"
                : cfg.accessKeyId
                  ? "sigv4"
                  : "none"
              : cfg.apiKey
                ? "api-key"
                : "none",
          guardrail: guardrailActive(cfg)
            ? { id: cfg.guardrailId, version: cfg.guardrailVersion }
            : null,
          configured: isAiConfigured(),
        };

        if (!summary.configured) {
          return json({ ok: false, ...summary, error: "AI provider is not configured." }, 503);
        }

        try {
          const result = await aiChat({
            system:
              "You are a health check. Reply with exactly the single word OK and nothing else.",
            user: "Health check.",
            maxTokens: 5,
            temperature: 0,
          });
          return json({
            ok: true,
            ...summary,
            reply: result.content,
            latencyMs: result.latencyMs,
            usage: result.usage,
            guardrailTrace: result.guardrailTrace ?? null,
          });
        } catch (err) {
          return json(
            { ok: false, ...summary, error: err instanceof Error ? err.message : String(err) },
            502,
          );
        }
      },
    },
  },
});
