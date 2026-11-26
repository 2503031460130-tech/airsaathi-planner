import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
// Compile the real TypeScript source so the test needs no checked-in build output.
const outfile = join(await mkdtemp(join(tmpdir(), "airsaathi-msg-")), "m.mjs");
await build({
  entryPoints: [join(process.cwd(), "src", "messages.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile,
  logLevel: "silent",
});
const { messages } = await import(pathToFileURL(outfile).href);
test("Hindi and English dictionary keys match", () =>
  assert.deepEqual(
    Object.keys(messages.en).sort(),
    Object.keys(messages.hi).sort(),
  ));
test("all Hindi dictionary entries have Devanagari text", () => {
  for (const [key, value] of Object.entries(messages.hi))
    assert(/[\u0900-\u097f]/u.test(value), key);
});
test("no translation value is empty", () => {
  for (const lang of Object.values(messages))
    for (const value of Object.values(lang)) assert(value.trim().length > 0);
});
