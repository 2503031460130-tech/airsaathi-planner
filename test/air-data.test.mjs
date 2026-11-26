import test from "node:test";
import assert from "node:assert/strict";
import { CITIES, classify, indiaDate } from "../src/air-data.mjs";
const now = 1795518000000;
test("only exact supported city anchors are configured", () =>
  assert.deepEqual(Object.keys(CITIES).sort(), [
    "Delhi",
    "Kanpur",
    "Kolkata",
    "Lucknow",
    "Mumbai",
    "Vadodara",
  ]));
test("provider data age is explicit", () => {
  assert.equal(classify(null, now), "unavailable");
  assert.equal(
    classify(
      { retrievedAt: new Date(now - 3600001).toISOString(), rows: [] },
      now,
    ),
    "cached-old",
  );
  assert.equal(
    classify(
      { retrievedAt: new Date(now + 60001).toISOString(), rows: [] },
      now,
    ),
    "unavailable",
  );
});
test("partial remains partial, not invented zero", () =>
  assert.equal(
    classify(
      { retrievedAt: new Date(now).toISOString(), rows: [{ pm: null }] },
      now,
    ),
    "partial",
  ));
test("fresh complete data is connected", () =>
  assert.equal(
    classify(
      { retrievedAt: new Date(now).toISOString(), rows: [{ pm: 18 }] },
      now,
    ),
    "connected",
  ));
test("tomorrow uses IST date boundary", () =>
  assert.equal(indiaDate(Date.parse("2026-11-24T20:00:00Z"), 1), "2026-11-26"));
