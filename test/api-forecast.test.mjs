import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp } from "node:fs/promises";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = await mkdtemp(
  join(process.cwd(), "node_modules", ".airsaathi-api-"),
);
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));
const outfile = join(dir, "api.mjs");
await build({
  entryPoints: [join(process.cwd(), "src", "api.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile,
  logLevel: "silent",
});
const { isForecastData } = await import(pathToFileURL(outfile).href);
const good = () => ({
  retrievedAt: "2026-11-26T10:00:00.000Z",
  provider: "OpenWeather",
  rows: [
    {
      time: "2026-11-27T06:30",
      validAt: "2026-11-27T01:00:00.000Z",
      pm: 20,
      pm10: null,
    },
  ],
});
test("forecast response with valid rows is accepted", () => {
  assert.equal(isForecastData(good()), true);
});
test("forecast response with a malformed row is rejected", () => {
  for (const mutate of [
    (d) => (d.rows[0].pm = -1),
    (d) => (d.rows[0].pm = 5001),
    (d) => (d.rows[0].pm = "20"),
    (d) => (d.rows[0].time = "tomorrow"),
    (d) => (d.rows = []),
    (d) => (d.retrievedAt = "not a date"),
    (d) => delete d.provider,
  ]) {
    const d = good();
    mutate(d);
    assert.equal(isForecastData(d), false);
  }
  assert.equal(isForecastData(null), false);
});
