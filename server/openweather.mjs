import { readCapped } from "./bounded-body.mjs";
import { CITIES } from "../src/air-data.mjs";

/**
 * Builds the secure upstream OpenWeather Air Pollution forecast API URL.
 *
 * @param {string} city - Supported anchor city name
 * @param {string} key - Provider secret key
 * @returns {string} Fully qualified provider URL
 * @throws {Error} If city is unsupported or key is missing
 */
export function openWeatherUrl(city, key) {
  const c = CITIES[city];
  if (!c) throw Error("Unsupported city");
  if (typeof key !== "string" || !key.trim())
    throw Error("Provider key unavailable");
  const u = new URL(
    "https://api.openweathermap.org/data/2.5/air_pollution/forecast",
  );
  u.searchParams.set("lat", String(c.lat));
  u.searchParams.set("lon", String(c.lon));
  u.searchParams.set("appid", key);
  return u.toString();
}

/**
 * Sanitizes and bounds pollutant concentration value.
 *
 * @param {any} value - Raw concentration number
 * @returns {number | null} Validated concentration or null
 * @throws {Error} If value violates numeric boundaries (0 to 5000 µg/m³)
 */
function pollutant(value) {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 5000
  )
    throw Error("Invalid concentration");
  return value;
}

/**
 * Normalizes upstream OpenWeather response into internal AirSaathi forecast contract.
 *
 * @param {any} raw - Upstream API JSON body
 * @param {string} [retrievedAt=new Date().toISOString()] - ISO retrieval timestamp
 * @returns {import("../src/contracts").ForecastData}
 * @throws {Error} If structure is malformed or invalid
 */
export function normalizeOpenWeather(
  raw,
  retrievedAt = new Date().toISOString(),
) {
  if (
    !raw ||
    !Array.isArray(raw.list) ||
    raw.list.length < 1 ||
    raw.list.length > 200
  )
    throw Error("Invalid forecast structure");
  if (!Number.isFinite(Date.parse(retrievedAt)))
    throw Error("Invalid retrieval time");
  let previous = -Infinity;
  const rows = raw.list.map((item) => {
    if (
      !Number.isInteger(item?.dt) ||
      item.dt < 946684800 ||
      item.dt > 4102444800 ||
      item.dt <= previous
    )
      throw Error("Invalid or unordered forecast timestamp");
    previous = item.dt;
    const ms = item.dt * 1000,
      local = new Date(ms + 330 * 60000).toISOString().slice(0, 16);
    // Preserve the actual half-hour offset. Do NOT relabel 06:30 IST as 06:00.
    return {
      time: local,
      validAt: new Date(ms).toISOString(),
      pm: pollutant(item.components?.pm2_5),
      pm10: pollutant(item.components?.pm10),
    };
  });
  return {
    rows,
    retrievedAt,
    modelRunAt: null,
    provider: "OpenWeather",
    kind: "forecast",
    timezone: "Asia/Kolkata",
    units: "µg/m³",
    resolution: null,
    sourceStep: "hourly",
    license: "ODbL",
    attribution: "Weather data provided by OpenWeather",
    plannerCompatible: false,
  };
}
export function createOpenWeatherLoader({
  fetcher = fetch,
  getKey,
  now = () => Date.now(),
  ttl = 15 * 60000,
  timeout = 8000,
} = {}) {
  const cache = new Map(),
    pending = new Map();
  return async (city) => {
    if (!CITIES[city]) throw Error("Unsupported city");
    const entry = cache.get(city),
      age = entry ? now() - Date.parse(entry.retrievedAt) : Infinity;
    if (entry && age >= 0 && age < ttl) return { ...entry, fromCache: true };
    if (pending.has(city)) return pending.get(city);
    const work = (async () => {
      const c = new AbortController(),
        timer = setTimeout(() => c.abort(), timeout);
      try {
        const r = await fetcher(openWeatherUrl(city, getKey?.()), {
          signal: c.signal,
          redirect: "error",
        });
        if (!r.ok) throw Error("Provider unavailable");
        const data = normalizeOpenWeather(
          JSON.parse(await readCapped(r, 262144)),
          new Date(now()).toISOString(),
        );
        cache.set(city, data);
        return { ...data, fromCache: false };
      } catch {
        // Never surface fetch errors containing the credential-bearing request URL.
        if (entry)
          return {
            ...entry,
            fromCache: true,
            error: "Forecast refresh failed; previous timestamp retained",
          };
        throw Error("Forecast unavailable");
      } finally {
        clearTimeout(timer);
        pending.delete(city);
      }
    })();
    pending.set(city, work);
    return work;
  };
}
