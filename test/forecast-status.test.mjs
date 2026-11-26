import test from "node:test";
import assert from "node:assert/strict";
import { forecastStatus } from "../src/forecast-status.mjs";
test("city change never claims connected without current data", () =>
  assert.equal(
    forecastStatus({ phase: "idle", data: null, currentStatus: "unavailable" }),
    "loadRequired",
  ));
test("cache flag cannot conceal partial or invalid data", () => {
  assert.equal(
    forecastStatus({
      phase: "ready",
      data: { fromCache: true },
      currentStatus: "partial",
    }),
    "partial",
  );
  assert.equal(
    forecastStatus({
      phase: "ready",
      data: { fromCache: true },
      currentStatus: "unavailable",
    }),
    "unavailable",
  );
});
test("old retrieval remains old even when cache returned", () =>
  assert.equal(
    forecastStatus({
      phase: "ready",
      data: { fromCache: true },
      currentStatus: "cached-old",
    }),
    "old",
  ));
test("success only with completed current response", () => {
  assert.equal(
    forecastStatus({
      phase: "ready",
      data: { fromCache: false },
      currentStatus: "connected",
    }),
    "connected",
  );
  assert.equal(
    forecastStatus({
      phase: "ready",
      data: { fromCache: true },
      currentStatus: "connected",
    }),
    "cached",
  );
});
test("loading/error override previous retained data", () => {
  assert.equal(
    forecastStatus({ phase: "loading", data: {}, currentStatus: "connected" }),
    "loading",
  );
  assert.equal(
    forecastStatus({ phase: "error", data: {}, currentStatus: "connected" }),
    "unavailable",
  );
});
