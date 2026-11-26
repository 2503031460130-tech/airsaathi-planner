import { readCapped } from "./bounded-body.mjs";

/**
 * Maximum body size for AI explanation payloads.
 * @type {number}
 */
const MAX_BODY = 20000;

/**
 * Strict allowlist of approved action identifiers that the AI model is permitted to explain.
 * Any request attempting to supply custom actions or free text is immediately rejected.
 * @type {readonly string[]}
 */
export const ACTIONS = Object.freeze([
  "no-idling",
  "source-control",
  "combine-trip",
]);

/**
 * Validates incoming AI explanation requests against strict privacy criteria.
 * Rejects schedules, locations, health details, free text, or unapproved action IDs.
 *
 * @param {any} input - Incoming request body
 * @returns {{ actionIds: string[], language: "en" | "hi" }}
 * @throws {Error} If payload violates security and schema boundaries
 */
export function validateExplain(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => !["actionIds", "language"].includes(k))
  )
    throw Error("Only actionIds and language are allowed");
  if (
    !["en", "hi"].includes(input.language) ||
    !Array.isArray(input.actionIds) ||
    input.actionIds.length < 1 ||
    input.actionIds.length > 3 ||
    new Set(input.actionIds).size !== input.actionIds.length ||
    input.actionIds.some((x) => !ACTIONS.includes(x))
  )
    throw Error("Invalid explanation request");
  return { actionIds: [...input.actionIds], language: input.language };
}
/**
 * Validates the AI model response against strict safety and schema constraints.
 * Rejects numeric claims, HTML, health guarantees, wrong-language responses, and duplicate IDs.
 *
 * @param {any} raw - Raw parsed JSON object from the AI model
 * @param {string[]} ids - Approved action IDs that were requested
 * @param {"en" | "hi"} language - Expected response language
 * @returns {{ id: string, text: string }[]} Validated explanation array
 * @throws {Error} If any explanation violates structural or content safety rules
 */
export function validateResponse(raw, ids, language) {
  if (
    !raw ||
    !Array.isArray(raw.explanations) ||
    raw.explanations.length !== ids.length
  )
    throw Error("Invalid explanation response");
  for (const x of raw.explanations) {
    if (
      !x ||
      !ids.includes(x.id) ||
      typeof x.text !== "string" ||
      x.text.length < 10 ||
      x.text.length > 500 ||
      /[<>\p{N}]/u.test(x.text) ||
      /guarantee|cure|safe air|prevent disease|ozone generator/i.test(x.text)
    )
      throw Error("Unsafe or invalid explanation");
    if (language === "hi" && !/\p{Script=Devanagari}/u.test(x.text))
      throw Error("Wrong language");
    if (language === "en" && /\p{Script=Devanagari}/u.test(x.text))
      throw Error("Wrong language");
  }
  if (new Set(raw.explanations.map((x) => x.id)).size !== ids.length)
    throw Error("Duplicate action");
  return raw.explanations.map((x) => ({ id: x.id, text: x.text }));
}
/**
 * Constructs a privacy-preserving AI prompt for generic action explanations.
 * Zero PII, zero routine data, and zero personal context are included.
 *
 * @param {{ actionIds: string[], language: "en" | "hi" }} input - Validated explanation request
 * @returns {string} Safe, structured prompt string for the AI model
 */
export function buildPrompt(input) {
  const v = validateExplain(input);
  return `Explain these general lower-emission or indoor-source-control action IDs in ${v.language === "hi" ? "Hindi" : "English"}: ${v.actionIds.join(", ")}. Return JSON only: {"explanations":[{"id":"approved action ID","text":"brief plain explanation"}]}. Do not use numbers, health claims, safety guarantees, personal advice, invented measurements, HTML or additional action IDs. no-idling means reduce unnecessary engine idling when safely parked; source-control means avoid indoor smoke and unnecessary burning; combine-trip means an optional separate vehicle errand can be combined only when practical. No information about any person is supplied.`;
}
export async function explain(
  input,
  {
    key,
    model = "gemini-3.5-flash-lite",
    fetcher = fetch,
    timeout = 8000,
  } = {},
) {
  const v = validateExplain(input);
  if (!key)
    return {
      status: "unavailable",
      reason: "GenAI is not connected",
      explanations: [],
    };
  if (!/^[a-z0-9.-]+$/.test(model)) throw Error("Invalid configured model");
  const c = new AbortController(),
    timer = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(v) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 600,
          },
        }),
        signal: c.signal,
      },
    );
    if (!r.ok)
      return {
        status: "unavailable",
        reason:
          r.status === 429
            ? "Model quota reached"
            : r.status === 404
              ? "Configured model unavailable"
              : r.status === 401 || r.status === 403
                ? "Model authorization failed"
                : "Model request failed",
        httpStatus: r.status,
        requestedModel: model,
        explanations: [],
      };
    const rawBody = await readCapped(r, MAX_BODY);
    const out = JSON.parse(rawBody),
      text = out?.candidates?.[0]?.content?.parts
        ?.map((x) => x.text || "")
        .join("");
    return {
      status: "generated",
      requestedModel: model,
      modelVersion:
        typeof out.modelVersion === "string" ? out.modelVersion : null,
      explanations: validateResponse(JSON.parse(text), v.actionIds, v.language),
    };
  } catch {
    return {
      status: "unavailable",
      reason: "Model output unavailable or rejected",
      explanations: [],
    };
  } finally {
    clearTimeout(timer);
  }
}
