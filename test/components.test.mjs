import { createElement } from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Render the real components to static HTML (no browser) and check output.
// Temp dir sits under node_modules so bare imports (react) resolve; removed after the run.
const dir = await mkdtemp(
  join(process.cwd(), "node_modules", ".airsaathi-ui-"),
);
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));
const entry = join(dir, "entry.tsx");
const cwd = process.cwd().replace(/\\/g, "/");
await writeFile(
  entry,
  `import { renderToStaticMarkup } from "react-dom/server";
import { NumberField } from "${cwd}/src/NumberField";
import { PlanResultSection } from "${cwd}/src/PlanResult";
import { EvidenceGroup } from "${cwd}/src/EvidenceGroup";
import { messages } from "${cwd}/src/messages";
import { Gate } from "${cwd}/src/Gate";
import { computePlan } from "${cwd}/src/compute-plan";
export { renderToStaticMarkup, NumberField, PlanResultSection, EvidenceGroup, messages, computePlan, Gate };`,
);
const out = join(dir, "entry.mjs");
await build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  outfile: out,
  loader: { ".css": "empty", ".png": "dataurl" },
  logLevel: "silent",
});
const m = await import(pathToFileURL(out).href);
const h = m.renderToStaticMarkup;
const input = {
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
const resultProps = (over = {}, plan = {}) => ({
  strings: m.messages.en,
  hindi: false,
  city: "Delhi",
  error: "",
  planShown: true,
  planResult: m.computePlan({ ...input, ...plan }).planResult,
  dataSource: "demo",
  combineTrip: false,
  errandKm: 4,
  workStart: 8,
  workEnd: 17,
  ...over,
});

test("NumberField marks out-of-range values invalid and links the error", () => {
  const html = h(
    m.NumberField({ label: "From", value: 99, min: 6, max: 19, onChange() {} }),
  );
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="plan-error"/);
});

test("NumberField valid value has no error wiring", () => {
  const html = h(
    m.NumberField({ label: "From", value: 7, min: 6, max: 19, onChange() {} }),
  );
  assert.match(html, /aria-invalid="false"/);
  assert.doesNotMatch(html, /aria-describedby/);
});

test("result shows the locked block, zero spend and a window", () => {
  const html = h(m.PlanResultSection(resultProps()));
  assert.match(html, /08:00–17:00/);
  assert.match(html, /₹0/);
  assert.match(html, /\d\d:00–\d\d:00/);
});

test("result before the user asks shows the empty state, not a plan", () => {
  const html = h(m.PlanResultSection(resultProps({ planShown: false })));
  assert.match(html, /Set the limits/);
  assert.doesNotMatch(html, /Locked time preserved/);
});

test("input error is shown with the id the fields point to", () => {
  const html = h(
    m.PlanResultSection(
      resultProps({ error: "Use whole hours", planResult: null }),
    ),
  );
  assert.match(html, /id="plan-error"/);
  assert.match(html, /Use whole hours/);
});

test("missing data shows no recommended window", () => {
  const html = h(m.PlanResultSection(resultProps({}, { scenario: "missing" })));
  assert.doesNotMatch(html, /<h3>\d\d:00–\d\d:00<\/h3>/);
});

test("Hindi result renders Hindi labels", () => {
  const html = h(
    m.PlanResultSection(resultProps({ hindi: true, strings: m.messages.hi })),
  );
  assert.match(html, /[\u0900-\u097F]/);
});

test("demo evidence has no OpenWeather attribution; forecast mode does", () => {
  const props = {
    strings: m.messages.en,
    hindi: false,
    dataSource: "demo",
    forecastDate: "2026-11-27",
    forecast: null,
    planResult: m.computePlan(input).planResult,
  };
  assert.doesNotMatch(h(m.EvidenceGroup(props)), /provided by/);
  assert.match(
    h(m.EvidenceGroup({ ...props, dataSource: "forecast" })),
    /provided by/,
  );
});

test("Gate renders a neutral checking state before the session is known", () => {
  const html = h(createElement(m.Gate));
  assert.ok(html.length > 0);
  assert.ok(!html.includes("Forecast"), "no planner content before approval");
});
