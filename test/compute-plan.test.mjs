import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// compute-plan.ts is TypeScript, so bundle it with esbuild before importing.
const dir = await mkdtemp(join(tmpdir(), "airsaathi-"));
const out = join(dir, "compute-plan.mjs");
await build({
  entryPoints: ["src/compute-plan.ts"],
  bundle: true,
  format: "esm",
  outfile: out,
  logLevel: "silent",
});
const { computePlan } = await import(pathToFileURL(out).href);

const base = {
  dataSource: "demo",
  forecast: null,
  city: "Delhi",
  forecastDate: "2026-11-27",
  scenario: "normal",
  walkStart: 7,
  walkEnd: 19,
  workStart: 8,
  workEnd: 17,
  combineTrip: false,
  errandKm: 4,
};

test("demo scenario returns a plan and no error", () => {
  const r = computePlan(base);
  assert.equal(r.error, "");
  assert.ok(r.planResult);
  assert.equal(r.planResult.cost, 0);
});

test("locked work block is never offered as a window", () => {
  const r = computePlan(base);
  if (r.planResult.best) {
    const h = r.planResult.best.h;
    assert.ok(h < 8 || h >= 17, `window ${h} overlaps locked 08-17`);
  }
});

test("missing scenario blocks advice instead of guessing", () => {
  const r = computePlan({ ...base, scenario: "missing" });
  assert.equal(r.planResult.blocked, true);
  assert.equal(r.planResult.best, null);
  assert.equal(r.planResult.reason, "missing");
});

test("forecast mode without loaded data for this city is treated as missing", () => {
  const r = computePlan({ ...base, dataSource: "forecast" });
  assert.equal(r.planResult.reason, "missing");
  assert.equal(r.planResult.best, null);
});

test("forecast loaded for another city is not used", () => {
  const forecast = {
    city: "Mumbai",
    rows: [],
    retrievedAt: new Date().toISOString(),
  };
  const r = computePlan({ ...base, dataSource: "forecast", forecast });
  assert.equal(r.planResult.reason, "missing");
});

test("invalid hours return an error message, not an exception", () => {
  const r = computePlan({ ...base, walkStart: NaN });
  assert.equal(r.planResult, null);
  assert.ok(r.error.length > 0);
});

test("combining a trip carries the entered distance", () => {
  const r = computePlan({ ...base, combineTrip: true, errandKm: 9 });
  assert.equal(r.planResult.distanceConsolidatedKm, 9);
  const off = computePlan({ ...base, combineTrip: false, errandKm: 9 });
  assert.equal(off.planResult.distanceConsolidatedKm, 0);
});
