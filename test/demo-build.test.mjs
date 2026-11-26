import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const run = () => {
  execFileSync("node", ["build-demo.mjs"], { stdio: "pipe" });
  return readFileSync("public-demo/main.js", "utf8");
};

test("public demo bundle makes no network requests", () => {
  const js = run();
  assert.equal(js.includes("fetch("), false);
  for (const path of ["/api/forecast", "/api/explain", "/api/session"])
    assert.equal(js.includes(path), false, path + " found in demo bundle");
});

test("public demo says AI is off and data is synthetic", () => {
  const js = run();
  assert.match(js, /AI intentionally off/);
  assert.match(js, /synthetic sample data only/);
});

test("demo build is reproducible", () => {
  const hash = (s) => createHash("sha256").update(s).digest("hex");
  assert.equal(hash(run()), hash(run()));
});
