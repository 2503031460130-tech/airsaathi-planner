import test from "node:test";
import assert from "node:assert/strict";
import { plan } from "../src/planner.mjs";

// The TypeScript contract (src/contracts.ts) declares `reason` as a union.
// planner.mjs asserts that union with a JSDoc cast, so prove at runtime that
// every constructed value is a member and agrees with blocked/best/improved.
const REASONS = [
  "missing",
  "stale",
  "conflict",
  "insufficient-coverage",
  "no-improvement",
  "improved",
];
const modes = ["normal", "partial", "flat", "missing", "stale"];

const cases = [];
for (const mode of modes)
  for (let start = 6; start <= 19; start += 3)
    for (let end = start + 1; end <= 20; end += 4)
      for (const commute of [6, 8, 11])
        for (const workEnd of [commute + 1, 17, 20])
          if (workEnd > commute && workEnd <= 20)
            cases.push({ start, end, commute, workEnd, mode });

test("planner reason is always a member of the declared union", () => {
  let checked = 0;
  const seen = new Set();
  for (const c of cases) {
    let r;
    try {
      r = plan({ ...c, combine: false, distance: 0 });
    } catch {
      continue; // invalid input ranges throw by design
    }
    checked++;
    seen.add(r.reason);
    assert.ok(
      REASONS.includes(r.reason),
      `${JSON.stringify(c)} -> ${r.reason}`,
    );
    if (r.reason === "improved") {
      assert.equal(r.improved, true);
      assert.ok(r.best && !r.blocked);
    } else {
      assert.equal(r.improved, false);
    }
    if (["missing", "stale", "insufficient-coverage"].includes(r.reason))
      assert.equal(r.blocked, true);
    if (r.blocked) assert.equal(r.best, null);
  }
  assert.ok(checked > 100, "too few valid cases: " + checked);
  for (const r of ["missing", "stale", "improved"])
    assert.ok(seen.has(r), r + " branch never exercised");
});
test("custom forecast values above 5000 are rejected like live forecast data", () => {
  const hours = Array(14).fill(10);
  hours[3] = 5001;
  assert.throws(() => plan({ mode: "normal", forecastValues: hours }));
});
