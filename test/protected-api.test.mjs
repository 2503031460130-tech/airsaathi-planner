import test from "node:test";
import assert from "node:assert/strict";
import { createProtectedApi } from "../server/protected-api.mjs";
const user = {
  id: "fictional",
  email: "judge@example.invalid",
  confirmedAt: "2026-01-01",
};
const access = { expiresAt: 2000, adultApproved: true, regionEligible: true };
function setup(overrides = {}) {
  let calls = 0;
  const handle = createProtectedApi({
    getUser: async () => user,
    getAccess: async () => access,
    now: () => 1000,
    reserveExplain: async () => ({ allowed: true }),
    forecast: async () => {
      calls++;
      return { rows: [] };
    },
    explain: async () => {
      calls++;
      return { status: 503, body: { reason: "Disabled" } };
    },
    ...overrides,
  });
  return { handle, calls: () => calls };
}
const req = (path = "/api/forecast?city=Delhi", options = {}) =>
  new Request("https://app.invalid" + path, options);
test("anonymous and unconfirmed never reach either provider", async () => {
  for (const identity of [null, { ...user, confirmedAt: null }]) {
    const s = setup({ getUser: async () => identity });
    assert.equal((await s.handle(req())).status, 401);
    assert.equal(s.calls(), 0);
  }
});
test("expired revoked absent and nonadult access fail closed", async () => {
  for (const a of [
    null,
    { ...access, expiresAt: 1000 },
    { ...access, revoked: true },
    { ...access, adultApproved: false },
  ]) {
    const s = setup({ getAccess: async () => a });
    assert.equal((await s.handle(req())).status, 403);
    assert.equal(s.calls(), 0);
  }
});
test("server policy not request headers controls identity", async () => {
  const s = setup({ getUser: async () => null });
  assert.equal(
    (
      await s.handle(
        req("/api/session", {
          headers: {
            "x-user-email": user.email,
            Authorization: "Bearer forged",
          },
        }),
      )
    ).status,
    401,
  );
});
test("valid approved user can request only fixed city", async () => {
  const s = setup();
  assert.equal((await s.handle(req())).status, 200);
  for (const p of [
    "?city=Delhi&city=Mumbai",
    "?city=Delhi&lat=1",
    "?city=Hacked",
    "",
  ])
    assert.equal((await s.handle(req("/api/forecast" + p))).status, 400);
  assert.equal(s.calls(), 1);
});
test("cross-origin and missing-origin POST blocked before provider", async () => {
  const s = setup();
  for (const origin of ["", "https://evil.invalid"])
    assert.equal(
      (
        await s.handle(
          req("/api/explain", {
            method: "POST",
            headers: { origin },
            body: "{}",
          }),
        )
      ).status,
      403,
    );
  assert.equal(s.calls(), 0);
});
test("AI region eligibility is checked server-side", async () => {
  const s = setup({
    getAccess: async () => ({ ...access, regionEligible: false }),
  });
  assert.equal(
    (
      await s.handle(
        req("/api/explain", {
          method: "POST",
          headers: { origin: "https://app.invalid" },
          body: "{}",
        }),
      )
    ).status,
    403,
  );
  assert.equal(s.calls(), 0);
  assert.equal((await s.handle(req())).status, 200);
});
test("oversized body and method mismatch rejected", async () => {
  const s = setup();
  assert.equal(
    (
      await s.handle(
        req("/api/explain", {
          method: "POST",
          headers: { origin: "https://app.invalid" },
          body: "x".repeat(1025),
        }),
      )
    ).status,
    413,
  );
  assert.equal(
    (await s.handle(req("/api/forecast", { method: "POST" }))).status,
    405,
  );
  assert.equal(s.calls(), 0);
});
test("provider failure redacted and no-store responses", async () => {
  const s = setup({
    reserveExplain: async () => ({ allowed: true }),
    forecast: async () => {
      throw Error("sensitive URL");
    },
  });
  const r = await s.handle(req());
  assert.equal(r.status, 503);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert(!(await r.text()).includes("sensitive"));
});
test("rate limit blocks provider work", async () => {
  const s = setup({ take: () => ({ allowed: false }) });
  assert.equal((await s.handle(req())).status, 429);
  assert.equal(s.calls(), 0);
});

test("production AI disabled guard precedes eligibility or provider access", async () => {
  const s = setup({
    getAccess: async () => ({ ...access, regionEligible: false }),
    explainEnabled: () => false,
  });
  const r = await s.handle(
    req("/api/explain", {
      method: "POST",
      headers: { origin: "https://app.invalid" },
      body: "{}",
    }),
  );
  assert.equal(r.status, 503);
  assert.equal(
    (await r.json()).reason,
    "Live AI disabled; deterministic planner remains available",
  );
  assert.equal(s.calls(), 0);
});

test("model generation requires durable budget after body validation", async () => {
  const s = setup({ reserveExplain: async () => ({ allowed: false }) });
  const r = await s.handle(
    req("/api/explain", {
      method: "POST",
      headers: {
        origin: "https://app.invalid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actionIds: ["no-idling"], language: "en" }),
    }),
  );
  assert.equal(r.status, 429);
  assert.equal(s.calls(), 0);
});
test("region denial with AI enabled spends no budget slot, rate slot or provider call; eligible user reaches budget", async () => {
  let reserved = 0,
    taken = 0;
  const post = () =>
    req("/api/explain", {
      method: "POST",
      headers: {
        origin: "https://app.invalid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actionIds: ["no-idling"], language: "en" }),
    });
  const deny = setup({
    explainEnabled: () => true,
    getAccess: async () => ({ ...access, regionEligible: false }),
    reserveExplain: async () => {
      reserved++;
      return { allowed: true };
    },
    take: () => {
      taken++;
      return { allowed: true };
    },
  });
  const r = await deny.handle(post());
  assert.equal(r.status, 403);
  assert.equal(reserved, 0);
  assert.equal(taken, 0);
  assert.equal(deny.calls(), 0);
  for (const bad of [undefined, "true", 1]) {
    const s = setup({
      explainEnabled: () => true,
      getAccess: async () => ({ ...access, regionEligible: bad }),
      reserveExplain: async () => {
        reserved++;
        return { allowed: true };
      },
    });
    assert.equal((await s.handle(post())).status, 403);
  }
  assert.equal(reserved, 0);
  const ok = setup({
    explainEnabled: () => true,
    reserveExplain: async () => {
      reserved++;
      return { allowed: true };
    },
  });
  await ok.handle(post());
  assert.equal(reserved, 1);
});
