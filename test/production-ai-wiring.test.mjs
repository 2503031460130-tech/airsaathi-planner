import test from "node:test";
import assert from "node:assert/strict";
test("production function: AI flag alone stays off; full config without Blobs context fails closed before any model call", async () => {
  const keep = { ...process.env },
    oldFetch = globalThis.fetch;
  process.env.URL = "https://example.invalid";
  const owner = "00000000-0000-4000-8000-000000000001";
  let providerCalls = 0;
  globalThis.fetch = async (url, o) => {
    if (String(url).includes("generativelanguage")) providerCalls++;
    return Response.json({
      id: owner,
      email: "o@example.invalid",
      confirmed_at: "2026-11-24T10:08:31Z",
      app_metadata: {
        roles: [`airsaathi-eval-adult-until-${Date.now() + 60000}`],
      },
    });
  };
  try {
    const { default: handle } = await import("../netlify/functions/api.mjs");
    const post = (country) =>
      handle(
        new Request(process.env.URL + "/api/explain", {
          method: "POST",
          headers: {
            cookie: "nf_jwt=x",
            origin: process.env.URL,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ actionIds: ["no-idling"], language: "en" }),
        }),
        country ? { geo: { country: { code: country } } } : undefined,
      );
    process.env.AIRSAATHI_AI_ENABLED = "true";
    assert.equal((await post()).status, 503);
    Object.assign(process.env, {
      AIRSAATHI_TRIAL_CAMPAIGN: "trial-wiring-test",
      AIRSAATHI_TRIAL_OWNER_ID: owner,
      AIRSAATHI_TRIAL_LIMIT: "2",
      AIRSAATHI_TRIAL_EXPIRES_AT: String(Date.now() + 60000),
      GEMINI_API_KEY: "FICTIONAL",
    });
    // Host geolocation is the gate: unknown or EEA/UK/CH countries are refused.
    assert.equal((await post()).status, 403);
    assert.equal((await post("DE")).status, 403);
    const r = await post("IN");
    assert.equal(r.status, 429);
    assert.equal(providerCalls, 0);
  } finally {
    globalThis.fetch = oldFetch;
    for (const k of Object.keys(process.env))
      if (!(k in keep)) delete process.env[k];
    Object.assign(process.env, keep);
  }
});
