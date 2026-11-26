/**
 * Standard operating candidate hours across urban daily routines (06:00 to 20:00).
 * @type {readonly number[]}
 */
export const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/**
 * Deterministic synthetic fixtures representing various real-world data availability states.
 * Used for reliable offline testing, verification, and demo modes.
 * @type {Record<string, (number | null)[]>}
 */
export const FIXTURES = {
  normal: [145, 138, 130, 110, 90, 76, 67, 62, 65, 74, 87, 110, 132, 142],
  partial: [145, null, 130, 110, 90, 76, 67, 62, 65, 74, 87, 110, 132, 142],
  flat: HOURS.map(() => 125),
  missing: HOURS.map(() => null),
  stale: [145, 138, 130, 110, 90, 76, 67, 62, 65, 74, 87, 110, 132, 142],
};

/**
 * Deterministic core planning engine for AirSaathi.
 *
 * Evaluates viable 1-hour windows outside user-defined locked work/commute blocks.
 * Compares candidate windows against PM2.5 exposure proxy values and respects strict
 * data completeness and freshness constraints. Zero hallucination guarantee.
 *
 * @param {object} [options={}] - Planning configuration options
 * @param {number} [options.start=7] - Start of user's free time window (hour in 24h format, 6-19)
 * @param {number} [options.end=19] - End of user's free time window (hour in 24h format, 7-20)
 * @param {number} [options.commute=8] - Start of locked work/commute block (hour in 24h format, 6-19)
 * @param {number} [options.workEnd=17] - End of locked work/commute block (hour in 24h format, 7-20)
 * @param {string} [options.mode="normal"] - Scenario fixture mode ("normal" | "partial" | "flat" | "missing" | "stale")
 * @param {number} [options.distance=4] - Potential distance saved through trip consolidation in km (0-200)
 * @param {boolean} [options.combine=false] - Whether user can combine an errand with existing commute
 * @param {(number | null)[] | null} [options.forecastValues=null] - Optional external forecast proxy values
 * @returns {import("./contracts").PlannerResult} Structured planning evaluation result
 * @throws {Error} When input boundaries or formats are violated
 */
export function plan({
  start = 7,
  end = 19,
  commute = 8,
  workEnd = 17,
  mode = "normal",
  distance = 4,
  combine = false,
  forecastValues = null,
} = {}) {
  for (const x of [start, end, commute, workEnd])
    if (!Number.isInteger(x)) throw Error("Use whole hours in this prototype.");
  for (const x of [start, end, commute, workEnd, distance])
    if (!Number.isFinite(x)) throw Error("Use valid numbers.");
  if (
    start < 6 ||
    end > 20 ||
    end <= start ||
    commute < 6 ||
    commute > 19 ||
    workEnd <= commute ||
    workEnd > 20 ||
    distance < 0 ||
    distance > 200
  )
    throw Error("Check the time window, work hours and distance.");
  if (!FIXTURES[mode]) throw Error("Unknown data scenario.");
  if (
    forecastValues !== null &&
    (!Array.isArray(forecastValues) ||
      forecastValues.length !== HOURS.length ||
      forecastValues.some(
        (x) => x !== null && (!Number.isFinite(x) || x < 0 || x > 5000),
      ))
  )
    throw Error("Invalid custom forecast");
  const rows = HOURS.map((h, i) => ({
    h,
    pm: forecastValues ? forecastValues[i] : FIXTURES[mode][i],
    allowed: h >= start && h + 1 <= end && !(h >= commute && h < workEnd),
  }));
  const feasible = rows.filter((x) => x.allowed);
  const candidates = feasible.filter((x) => x.pm !== null);
  const coverage = {
    available: candidates.length,
    total: feasible.length,
    missingHours: feasible.filter((x) => x.pm === null).map((x) => x.h),
  };
  const insufficient = coverage.missingHours.length > 0;
  const base = candidates[0] || null;
  const best = candidates.reduce((a, b) => (!a || b.pm < a.pm ? b : a), null);
  const improved = Boolean(base && best && best.pm < base.pm);
  const blocked =
    mode === "missing" || mode === "stale" || !best || insufficient;
  return {
    rows,
    base,
    best: blocked ? null : best,
    improved: !blocked && improved,
    blocked,
    reason: /** @type {import("./contracts").PlannerResult["reason"]} */ (
      mode === "missing" || rows.every((x) => x.pm === null)
        ? "missing"
        : mode === "stale"
          ? "stale"
          : !feasible.length
            ? "conflict"
            : insufficient
              ? "insufficient-coverage"
              : !improved
                ? "no-improvement"
                : "improved"
    ),
    locks: [{ start: commute, end: workEnd }],
    cost: 0,
    distanceConsolidatedKm: combine ? distance : 0,
    coverage,
    trace: {
      candidateHours: candidates.length,
      lockedHours: workEnd - commute,
    },
    actions: [
      "no-idling",
      "source-control",
      ...(combine ? ["combine-trip"] : []),
    ],
  };
}
