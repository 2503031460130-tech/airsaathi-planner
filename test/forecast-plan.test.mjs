import test from "node:test";
import assert from "node:assert/strict";
import { intervalScores, planForecast } from "../src/forecast-plan.mjs";
const midnight = Date.parse("2026-11-25T00:00:00+05:30");
const data = () => ({
  provider: "Fictional",
  retrievedAt: new Date(midnight).toISOString(),
  rows: Array.from({ length: 48 }, (_, i) => ({
    validAt: new Date(midnight - 1800000 + i * 3600000).toISOString(),
    pm: 100 - i,
  })),
});
test("half-hour samples bracket complete clock hour without relabelling", () => {
  const d = data(),
    b = intervalScores(d, "2026-11-25")[0];
  assert.equal(b.h, 6);
  assert.equal(b.samples.length, 3);
  assert.equal(b.score, 94);
  assert.equal(b.samples[0].at, midnight + 5.5 * 3600000);
});
test("exact-hour source includes both endpoints", () => {
  const d = data();
  d.rows = d.rows.map((r, i) => ({
    ...r,
    validAt: new Date(midnight + i * 3600000).toISOString(),
  }));
  assert.equal(intervalScores(d, "2026-11-25")[0].samples.length, 2);
});
test("null interior and bracketing samples invalidate comparison", () => {
  for (const i of [6, 7, 8]) {
    const d = data();
    d.rows[i].pm = null;
    assert.equal(intervalScores(d, "2026-11-25")[0].score, null);
  }
});
test("never bridge missing hour or extrapolate either edge", () => {
  let d = data();
  d.rows.splice(7, 1);
  assert.equal(intervalScores(d, "2026-11-25")[0].score, null);
  d = data();
  d.rows = d.rows.slice(7);
  assert.equal(intervalScores(d, "2026-11-25")[0].score, null);
  d = data();
  d.rows = d.rows.slice(0, 8);
  assert.equal(intervalScores(d, "2026-11-25")[0].score, null);
});
test("date and time integrity rejects invalid days duplicate and reversed sources", () => {
  for (const date of ["2026-02-30", "garbage", "2026-13-01"])
    assert.throws(() => intervalScores(data(), date));
  const d = data();
  d.rows[1] = d.rows[0];
  assert.throws(() => intervalScores(d, "2026-11-25"));
});
test("forecast planner preserves locked work and returns labelled proxy", () => {
  const p = planForecast({
    data: data(),
    date: "2026-11-25",
    now: midnight,
    start: 6,
    end: 20,
    commute: 8,
    workEnd: 17,
  });
  assert.equal(p.best.h, 19);
  assert.equal(p.metric, "max-bracketing-sample");
  assert(!p.rows.filter((r) => r.h >= 8 && r.h < 17).some((r) => r.allowed));
});
test("stale future and unknown retrieval fail closed", () => {
  for (const retrievedAt of [
    "bad",
    new Date(midnight - 7200000).toISOString(),
    new Date(midnight + 120000).toISOString(),
  ]) {
    const d = data();
    d.retrievedAt = retrievedAt;
    assert.equal(
      planForecast({ data: d, date: "2026-11-25", now: midnight }).best,
      null,
    );
  }
});
test("one missing feasible block suppresses best-hour recommendation", () => {
  const d = data();
  d.rows[7].pm = null;
  const p = planForecast({
    data: d,
    date: "2026-11-25",
    now: midnight,
    start: 6,
  });
  assert.equal(p.best, null);
  assert.equal(p.reason, "insufficient-coverage");
});
