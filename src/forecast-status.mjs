/**
 * @param {{ phase: string, data: { fromCache?: boolean } | null, currentStatus: string }} input
 * @returns {"loading" | "unavailable" | "loadRequired" | "old" | "partial" | "cached" | "connected"}
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
