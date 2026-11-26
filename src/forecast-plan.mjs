import { HOURS, plan } from "./planner.mjs";

/**
 * Calculates conservative proxy pollution scores for each candidate 1-hour interval.
 *
 * Ranking Proxy Rationale:
 * Instead of claiming an unverified continuous integral or sensor interpolation,
 * the score represents the maximum PM2.5 sample touching or bracketing the 1-hour window.
 * Adheres to strict data integrity: never extrapolates, interpolates, or bridges gaps > 1 hour.
 *
 * @param {import("./contracts").ForecastData | null | undefined} data - Validated forecast payload
 * @param {string} date - Forecast target date in YYYY-MM-DD format (IST)
 * @returns {Array<{ h: number, score: number | null, samples: Array<{ at: number, pm: number | null }>, reason: string }>}
 * @throws {Error} If date format or source sample sequence is invalid
 */
export function intervalScores(data, date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw Error("Invalid date");
  const day = new Date(`${date}T00:00:00+05:30`);
  if (
    !Number.isFinite(+day) ||
    new Date(+day + 330 * 60000).toISOString().slice(0, 10) !== date
  )
    throw Error("Invalid date");
  const rows = data?.rows;
  if (!Array.isArray(rows) || rows.length > 200)
    throw Error("Invalid source rows");
  const source = rows.map((r) => ({ at: Date.parse(r.validAt), pm: r.pm }));
  if (
    source.some(
      (r, i) =>
        !Number.isFinite(r.at) ||
        (i && r.at <= source[i - 1].at) ||
        (r.pm !== null && (!Number.isFinite(r.pm) || r.pm < 0 || r.pm > 5000)),
    )
  )
    throw Error("Invalid source samples");
  return HOURS.map((h) => {
    const start = +day + h * 3600000,
      end = start + 3600000;
    let left = -1;
    for (let i = 0; i < source.length; i++) {
      if (source[i].at <= start) left = i;
      else break;
    }
    const right = source.findIndex((r) => r.at >= end);
    if (left < 0 || right < 0)
      return { h, score: null, samples: [], reason: "uncovered" };
    const samples = source.slice(left, right + 1);
    if (
      samples.some(
        (s, i) => s.pm === null || (i && s.at - samples[i - 1].at > 3600000),
      )
    )
      return { h, score: null, samples, reason: "missing-or-gap" };
    return {
      h,
      score: Math.max(...samples.map((s) => s.pm)),
      samples,
      reason: "covered",
    };
  });
}

/**
 * Plans outdoor schedule based on real external forecast data with freshness audit.
 * Fails closed if data age exceeds 1 hour.
 *
 * @param {object} params - Forecast planning parameters
 * @param {import("./contracts").ForecastData} params.data - Ingested forecast payload
 * @param {string} params.date - Forecast date in YYYY-MM-DD format (IST)
 * @param {number} [params.now=Date.now()] - Current epoch timestamp in ms
 * @returns {import("./contracts").PlannerResult & { blocks: any[], metric: string, metricNotice: string, sourceProvider: string, sourceRetrievedAt: string }}
 */
export function planForecast({ data, date, now = Date.now(), ...options }) {
  const blocks = intervalScores(data, date),
    age = now - Date.parse(data.retrievedAt);
  const stale = !Number.isFinite(age) || age > 3600000 || age < -60000;
  const result = plan({
    ...options,
    mode: stale ? "stale" : "normal",
    forecastValues: blocks.map((b) => b.score),
  });
  return {
    ...result,
    blocks,
    metric: "max-bracketing-sample",
    metricNotice:
      "Ranking proxy: largest bracketing PM2.5 sample, not a whole-hour prediction, exposure average or safety guarantee.",
    sourceProvider: data.provider,
    sourceRetrievedAt: data.retrievedAt,
  };
}
