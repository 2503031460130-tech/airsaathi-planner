import { createRateLimit } from "./rate-limit.mjs";
import { explain, validateExplain } from "./ai.mjs";

/** Maximum allowed request body size in bytes for AI explanation payloads. */
export const MAX_BODY_BYTES = 1024;

/**
 * Creates the AI explanation request handler with configurable dependencies.
 * Validates method, content-type, body size, action allowlist, and rate limits before
 * forwarding to the AI generation layer.
 *
 * @param {object} [options={}] - Handler configuration
 * @param {() => string | undefined} [options.getKey] - API key supplier (default: GEMINI_API_KEY env)
 * @param {string} [options.model] - Gemini model identifier
 * @param {Function} [options.generate] - AI generation function (default: explain)
 * @param {() => boolean} [options.enabled] - Feature flag supplier (default: AIRSAATHI_AI_ENABLED env)
 * @param {Function} [options.take] - Rate limit token supplier (default: createRateLimit())
 * @returns {(req: { method: string, body: string, contentType?: string }) => Promise<{ status: number, headers?: object, body: object }>} Async request handler
 */
export function createHandler({
  getKey = () => process.env.GEMINI_API_KEY,
  model = "gemini-3.5-flash-lite",
  generate = explain,
  enabled = () => process.env.AIRSAATHI_AI_ENABLED === "true",
  take = createRateLimit(),
} = {}) {
  return async function handle({
    method,
    body,
    contentType = "application/json",
  } = {}) {
    if (method !== "POST")
      return {
        status: 405,
        headers: { Allow: "POST" },
        body: { status: "unavailable", reason: "Use POST" },
      };
    if (!contentType.startsWith("application/json"))
      return {
        status: 415,
        body: { status: "unavailable", reason: "Use JSON" },
      };
    if (
      typeof body !== "string" ||
      Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES
    )
      return {
        status: 413,
        body: { status: "unavailable", reason: "Request too large" },
      };
    let input;
    try {
      input = validateExplain(JSON.parse(body));
    } catch {
      return {
        status: 400,
        body: {
          status: "unavailable",
          reason: "Only approved generic actions and language are accepted",
        },
      };
    }
    if (!enabled())
      return {
        status: 503,
        body: {
          status: "unavailable",
          reason: "Live AI disabled; deterministic planner remains available",
        },
      };
    const slot = take();
    if (!slot.allowed)
      return {
        status: 429,
        headers: {
          "Retry-After": String(slot.retryAfter),
          "Cache-Control": "no-store",
        },
        body: {
          status: "unavailable",
          reason:
            "Local burst limit reached; deterministic planner remains available",
        },
      };
    const result = await generate(input, { key: getKey(), model });
    return {
      status: result.status === "generated" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
      body: result,
    };
  };
}
