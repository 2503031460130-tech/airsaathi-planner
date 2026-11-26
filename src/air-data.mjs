/**
 * City anchor coordinates (latitude/longitude) for supported Indian urban centers.
 * @type {Readonly<Record<string, { lat: number, lon: number }>>}
 */
export const CITIES = Object.freeze({
  Delhi: { lat: 28.61, lon: 77.21 },
  Vadodara: { lat: 22.31, lon: 73.18 },
  Mumbai: { lat: 19.08, lon: 72.88 },
  Lucknow: { lat: 26.85, lon: 80.95 },
  Kanpur: { lat: 26.45, lon: 80.33 },
  Kolkata: { lat: 22.57, lon: 88.36 },
});

/**
 * Classifies the freshness and completeness status of air quality forecast data.
 * Adheres to fail-closed integrity rules (stale or partial data is flagged explicitly).
 *
 * @param {import("./contracts").ForecastData | null} data - Ingested forecast payload
 * @param {number} [now=Date.now()] - Current epoch timestamp in ms
 * @returns {"unavailable" | "cached-old" | "partial" | "connected"} Forecast state classifier
 */
export function classify(data, now = Date.now()) {
  if (!data) return "unavailable";
  const age = now - Date.parse(data.retrievedAt);
  if (age < -60000) return "unavailable";
  if (age > 3600000) return "cached-old";
  return data.rows.some((x) => x.pm === null) ? "partial" : "connected";
}

/**
 * Calculates calendar date in Indian Standard Time (IST, UTC+05:30) with optional day offset.
 *
 * @param {number} [now=Date.now()] - Current epoch timestamp in ms
 * @param {number} [days=0] - Day offset (e.g. 1 for tomorrow)
 * @returns {string} YYYY-MM-DD date string in IST
 */
export function indiaDate(now = Date.now(), days = 0) {
  const shifted = new Date(now + days * 86400000 + 330 * 60000);
  return shifted.toISOString().slice(0, 10);
}
