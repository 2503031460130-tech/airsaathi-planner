/**
 * Derives the display status key for the forecast data panel from phase and data freshness.
 * Maps the combination of fetch lifecycle phase, data presence, and freshness classification
 * to a UI-renderable string key that selects the appropriate bilingual message.
 *
 * @param {{ phase: string, data: import("./contracts").ForecastData | null, currentStatus: import("./contracts").DataStatus }} input - Current fetch lifecycle state
 * @param {"loading" | "error" | "ready" | string} input.phase - Current fetch lifecycle phase
 * @param {import("./contracts").ForecastData | null} input.data - Latest ingested forecast payload, or null if unavailable
 * @param {string} input.currentStatus - Classified data freshness from {@link classify}
 * @returns {"loading" | "unavailable" | "loadRequired" | "old" | "partial" | "cached" | "connected"} UI message key
 */
export function forecastStatus({ phase, data, currentStatus }) {
  if (phase === "loading") return "loading";
  if (phase === "error") return "unavailable";
  if (phase !== "ready" || !data) return "loadRequired";
  if (currentStatus === "unavailable") return "unavailable";
  if (currentStatus === "cached-old") return "old";
  if (currentStatus === "partial") return "partial";
  return data.fromCache ? "cached" : "connected";
}
