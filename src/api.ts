import type { ForecastData } from "./contracts";

/**
 * Validates whether a concentration value falls within valid physical ranges (0 to 5000 µg/m³).
 * @param x - Candidate pollutant value
 */
const validPm = (x: unknown): boolean =>
  x === null ||
  (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 5000);

/**
 * Runtime schema guard validating incoming forecast payloads across the network boundary.
 * Prevents malformed, injected, or partial data from reaching the planning core.
 *
 * @param d - Unknown network response body
 * @returns Type predicate confirming structure matches ForecastData contract
 */
export function isForecastData(d: unknown): d is ForecastData {
  const f = d as ForecastData | null;
  return (
    !!f &&
    typeof f === "object" &&
    typeof f.retrievedAt === "string" &&
    !Number.isNaN(Date.parse(f.retrievedAt)) &&
    typeof f.provider === "string" &&
    Array.isArray(f.rows) &&
    f.rows.length > 0 &&
    f.rows.length <= 200 &&
    f.rows.every(
      (r) =>
        !!r &&
        typeof r.time === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.time) &&
        typeof r.validAt === "string" &&
        validPm(r.pm) &&
        validPm(r.pm10),
    )
  );
}
export const loadForecast = async (city: string) => {
  const r = await fetch("/api/forecast?city=" + encodeURIComponent(city), {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!r.ok) throw Error("Forecast unavailable or access not approved");
  const data = await r.json();
  if (!isForecastData(data)) throw Error("Forecast response was incomplete");
  return data;
};
