import test from "node:test";
import assert from "node:assert/strict";
test("exact production function resolves session with current Identity cookie, not operator context", async () => {
  const oldFetch = globalThis.fetch,
    oldUrl = process.env.URL,
    oldContext = globalThis.netlifyIdentityContext;
  process.env.URL = "https://example.invalid";
  let roles = [`airsaathi-eval-adult-until-${Date.now() + 60000}`],
    calls = 0;
  globalThis.netlifyIdentityContext = {
    token: "operator-must-not-be-used",
    user: { email: "wrong@example.invalid" },
  };
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://example.invalid/.netlify/identity/user");
    assert.equal(
      options.headers.Authorization,
      "Bearer browser.session.credential",
    );
    return Response.json({
      id: "00000000-0000-4000-8000-000000000001",
      email: "owner@example.invalid",
      confirmed_at: "2026-11-24T10:08:31Z",
      app_metadata: { roles },
    });
  };
  try {
    const { default: handle, config } =
      await import("../netlify/functions/api.mjs");
    const req = (path = "/api/session", opts = {}) =>
      new Request(process.env.URL + path, {
        ...opts,
        headers: {
          cookie: "nf_jwt=browser.session.credential",
          ...opts.headers,
        },
      });
    assert.equal((await handle(req())).status, 200);
    roles = [];
    assert.equal((await handle(req())).status, 403);
    roles = [`airsaathi-eval-adult-until-${Date.now() - 1}`];
    assert.equal((await handle(req())).status, 403);
    roles = [`airsaathi-eval-adult-until-${Date.now() + 60000}`];
    assert.equal((await handle(req())).status, 200);
    const r = await handle(
      req("/api/explain", {
        method: "POST",
        headers: {
          origin: process.env.URL,
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    assert.equal(r.status, 503);
    assert.match((await r.json()).reason, /Live AI disabled/);
    const before = calls;
    assert.equal(
      (await handle(new Request(process.env.URL + "/api/session"))).status,
      401,
    );
    assert.equal(calls, before);
    assert.deepEqual(config.path, [
      "/api/forecast",
      "/api/explain",
      "/api/session",
      "/api/storage-probe",
    ]);
    assert.equal(config.rateLimit.windowLimit, 60);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.URL;
    else process.env.URL = oldUrl;
    globalThis.netlifyIdentityContext = oldContext;
  }
});
