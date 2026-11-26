import test from "node:test";
import assert from "node:assert/strict";
import { plan, HOURS } from "../src/planner.mjs";
test("fixed work hours never become exercise windows", () => {
  const p = plan();
  assert(p.best.h >= 17 || p.best.h < 8);
  assert.equal(p.locks[0].start, 8);
});
test("the plan never requires a paid action", () =>
  assert.equal(plan().cost, 0));
test("missing remains null, not zero", () => {
  const p = plan({ mode: "missing" });
  assert.equal(p.best, null);
  assert(p.rows.every((x) => x.pm === null));
});
test("stale does not produce timing advice", () =>
  assert.equal(plan({ mode: "stale" }).best, null));
test("infeasible window explained", () =>
  assert.equal(plan({ start: 9, end: 16 }).reason, "conflict"));
test("flat forecast does not invent improvement", () =>
  assert.equal(plan({ mode: "flat" }).reason, "no-improvement"));
test("consolidated distance is the input distance only when combining (a potential figure, not a verified saving)", () => {
  assert.equal(plan({ distance: 6, combine: false }).distanceConsolidatedKm, 0);
  assert.equal(plan({ distance: 6, combine: true }).distanceConsolidatedKm, 6);
});
test("invalid numbers rejected", () =>
  assert.throws(() => plan({ distance: NaN })));
test("invalid interval rejected", () =>
  assert.throws(() => plan({ start: 18, end: 7 })));
test("negative distance rejected", () =>
  assert.throws(() => plan({ distance: -1 })));
test("all feasible windows preserve lock, property sweep", () => {
  for (const start of HOURS)
    for (const end of HOURS.filter((x) => x > start)) {
      const p = plan({ start, end });
      if (p.best) assert(!(p.best.h >= 8 && p.best.h < 17));
    }
});
test("all scenarios have finite nonnegative cost", () => {
  for (const mode of ["normal", "flat", "stale", "missing"])
    assert.equal(plan({ mode }).cost, 0);
});
test("fractional clock hours rejected rather than silently rounded", () =>
  assert.throws(() => plan({ commute: 8.5 })));
test("custom forecast length checked", () =>
  assert.throws(() => plan({ forecastValues: [20] })));
test("custom forecast used without fixture substitution", () => {
  const p = plan({ forecastValues: HOURS.map(() => 42) });
  assert.equal(p.best.pm, 42);
  assert.equal(p.reason, "no-improvement");
});
test("custom all-null forecast is data-missing, not timing conflict", () =>
  assert.equal(
    plan({ forecastValues: HOURS.map(() => null) }).reason,
    "missing",
  ));

test("missing feasible hour blocks optimization, with exact coverage", () => {
  const values = HOURS.map(() => 42);
  values[1] = null;
  const p = plan({ forecastValues: values });
  assert.equal(p.reason, "insufficient-coverage");
  assert.equal(p.best, null);
  assert.equal(p.coverage.total, 3);
  assert.equal(p.coverage.available, 2);
  assert.deepEqual(p.coverage.missingHours, [7]);
});
test("missing locked hours do not block complete candidate coverage", () => {
  const values = HOURS.map((h) => (h >= 8 && h < 17 ? null : 42));
  const p = plan({ forecastValues: values });
  assert.equal(p.blocked, false);
  assert.equal(p.coverage.available, p.coverage.total);
});
test("missing outside availability does not block valid planning", () => {
  const p = plan({
    start: 17,
    end: 19,
    forecastValues: HOURS.map((h) => (h >= 17 ? 42 : null)),
  });
  assert.equal(p.blocked, false);
  assert.equal(p.coverage.total, 2);
});
test("only known feasible hour is not called a best hour if another is missing", () => {
  const p = plan({
    start: 17,
    end: 19,
    forecastValues: HOURS.map((h) => (h === 17 ? 12 : null)),
  });
  assert.equal(p.reason, "insufficient-coverage");
  assert.equal(p.best, null);
});

test("partial demo exercises incomplete comparison protection", () =>
  assert.equal(plan({ mode: "partial" }).reason, "insufficient-coverage"));
test("distance above supported interface limit is rejected", () =>
  assert.throws(() => plan({ distance: 201 })));
