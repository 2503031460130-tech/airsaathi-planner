import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOpenWeather,
  openWeatherUrl,
  createOpenWeatherLoader,
} from "../server/openweather.mjs";
const sample = () => ({
  list: [
    { dt: 1795478400, components: { pm2_5: 20, pm10: 40 } },
    { dt: 1795482000, components: { pm2_5: 30, pm10: 50 } },
  ],
});
const now = 1795478400000;
test("fictional OpenWeather contract preserves exact India half-hour", () => {
  const d = normalizeOpenWeather(sample(), new Date(now).toISOString());
  assert.equal(d.rows[0].time, "2026-11-24T05:30");
  assert.equal(d.rows[0].validAt, "2026-11-24T00:00:00.000Z");
  assert.equal(d.plannerCompatible, false);
  assert.equal(d.modelRunAt, null);
  assert.equal(d.resolution, null);
});
test("OpenWeather fixture null and absent are missing not zero", () => {
  let x = sample();
  x.list[0].components.pm2_5 = null;
  delete x.list[1].components.pm2_5;
  assert(normalizeOpenWeather(x).rows.every((r) => r.pm === null));
});
test("OpenWeather rejects malformed empty and oversized payloads", () => {
  for (const x of [
    null,
    {},
    { list: [] },
    { list: Array(201).fill(sample().list[0]) },
  ])
    assert.throws(() => normalizeOpenWeather(x));
});
test("OpenWeather timestamps strictly ascend", () => {
  for (const dt of [1795478400, 1795478399, "1795482000", null]) {
    const x = sample();
    x.list[1].dt = dt;
    assert.throws(() => normalizeOpenWeather(x));
  }
});
test("OpenWeather rejects bad concentrations", () => {
  for (const p of [-1, 5001, Infinity, NaN, "20"]) {
    const x = sample();
    x.list[0].components.pm2_5 = p;
    assert.throws(() => normalizeOpenWeather(x));
  }
});
test("OpenWeather invalid retrieval rejected", () =>
  assert.throws(() => normalizeOpenWeather(sample(), "bad")));
test("OpenWeather city cannot redirect provider request", () => {
  assert.throws(() => openWeatherUrl("https://attacker.invalid", "fictional"));
  const u = new URL(openWeatherUrl("Delhi", "fictional"));
  assert.equal(u.protocol, "https:");
  assert.equal(u.hostname, "api.openweathermap.org");
  assert.equal(u.searchParams.get("lat"), "28.61");
});
test("OpenWeather key absent rejects", () =>
  assert.throws(() => openWeatherUrl("Delhi", "")));
test("OpenWeather cache and concurrent dedupe are local only", async () => {
  let n = 0;
  const load = createOpenWeatherLoader({
    getKey: () => "fictional",
    now: () => now,
    fetcher: async () => {
      n++;
      return { ok: true, json: async () => sample() };
    },
  });
  await Promise.all([load("Delhi"), load("Delhi")]);
  assert.equal((await load("Delhi")).fromCache, true);
  assert.equal(n, 1);
});
test("OpenWeather network errors never leak URL key", async () => {
  const load = createOpenWeatherLoader({
    getKey: () => "fictional-secret-marker",
    fetcher: async (url) => {
      throw Error(url);
    },
  });
  await assert.rejects(
    load("Delhi"),
    (e) =>
      e.message === "Forecast unavailable" && !e.message.includes("marker"),
  );
});
test("OpenWeather refresh failure preserves original time", async () => {
  let t = now,
    n = 0;
  const load = createOpenWeatherLoader({
    getKey: () => "fictional",
    now: () => t,
    fetcher: async () => {
      if (n++) throw Error("offline");
      return { ok: true, json: async () => sample() };
    },
  });
  const a = await load("Delhi");
  t += 7200000;
  const b = await load("Delhi");
  assert.equal(a.retrievedAt, b.retrievedAt);
  assert(b.error);
});
test("OpenWeather 401 and 429 do not become fake forecasts", async () => {
  for (const status of [401, 429]) {
    const load = createOpenWeatherLoader({
      getKey: () => "fictional",
      fetcher: async () => ({ ok: false, status }),
    });
    await assert.rejects(load("Delhi"), /unavailable/);
  }
});
test("OpenWeather cache expires after ttl and refetches", async () => {
  let n = 0,
    clock = now;
  const load = createOpenWeatherLoader({
    getKey: () => "fictional",
    now: () => clock,
    ttl: 60000,
    fetcher: async () => {
      n++;
      return { ok: true, json: async () => sample() };
    },
  });
  await load("Delhi");
  clock += 59999;
  assert.equal((await load("Delhi")).fromCache, true);
  assert.equal(n, 1);
  clock += 2;
  assert.equal((await load("Delhi")).fromCache, false);
  assert.equal(n, 2);
});
test("OpenWeather refuses oversized provider bodies before parsing", async () => {
  const load = createOpenWeatherLoader({
    getKey: () => "fictional",
    now: () => now,
    fetcher: async () => ({
      ok: true,
      headers: new Headers({ "content-length": "999999" }),
      json: async () => sample(),
    }),
  });
  await assert.rejects(load("Delhi"), /Forecast unavailable/);
});
