import test from "node:test";
import assert from "node:assert/strict";
import { createProtectedApi } from "../server/protected-api.mjs";
import { createHandler } from "../server/handler.mjs";
import { createTrialBudget } from "../server/trial-budget.mjs";
const origin = "https://test.example.invalid";
const identity = {
  id: "fictional-owner",
  email: "owner@example.invalid",
  confirmedAt: "2026-11-24T10:00:00Z",
};
function setup({ innerTake, limit = 2, bodyDeadlineMs } = {}) {
  const keys = new Set();
  let generated = 0;
  const reserveExplain = createTrialBudget({
    store: {
      setJSON: async (k) => {
        await Promise.resolve();
        if (keys.has(k)) return { modified: false };
        keys.add(k);
        return { modified: true };
      },
    },
    campaign: "trial-integration-mock",
    limit,
    expiresAt: 2000,
    allowedUserId: identity.id,
    now: () => 1000,
  });
  const explain = createHandler({
    enabled: () => true,
    getKey: () => {
      throw Error("should not read key before budget");
    },
    generate: async () => ({ status: "generated", explanations: [] }),
  });
  const h = createProtectedApi({
    bodyDeadlineMs,
    getUser: async () => identity,
    getAccess: async () => ({
      expiresAt: 2000,
      adultApproved: true,
      regionEligible: true,
    }),
    now: () => 1000,
    explainEnabled: () => true,
    reserveExplain,
    explain: createHandler({
      // Production wiring: no second limiter after the durable slot is claimed.
      take: innerTake || (() => ({ allowed: true })),
      enabled: () => true,
      getKey: () => "FICTIONAL-NOT-A-KEY",
      generate: async (input) => {
        generated++;
        return {
          status: "generated",
          requestedModel: "fictional-mock",
          explanations: input.actionIds.map((id) => ({
            id,
            text: "A fictional plain explanation for this test.",
          })),
        };
      },
    }),
  });
  return { h, keys, count: () => generated };
}
const req = (language = "en", extra = {}) =>
  new Request(origin + "/api/explain", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      actionIds: ["no-idling", "source-control"],
      language,
      ...extra,
    }),
  });
test("full private API/handler/shared budget two-language workflow stops at two generations", async () => {
  const s = setup();
  assert.equal((await s.h(req("en"))).status, 200);
  assert.equal((await s.h(req("hi"))).status, 200);
  assert.equal((await s.h(req("en"))).status, 429);
  assert.equal(s.count(), 2);
  assert.equal(s.keys.size, 2);
});
test("invalid PII request cannot claim a trial slot", async () => {
  const s = setup();
  assert.equal(
    (await s.h(req("en", { schedule: "fictional personal routine" }))).status,
    400,
  );
  assert.equal(s.keys.size, 0);
  assert.equal(s.count(), 0);
});
test("concurrent valid owner requests cannot exceed shared budget through API", async () => {
  const s = setup();
  const r = await Promise.all(Array.from({ length: 20 }, () => s.h(req())));
  assert.equal(r.filter((x) => x.status === 200).length, 2);
  assert.equal(s.count(), 2);
});

test("production wiring never spends a budget slot without a generation", async () => {
  const s = setup({ limit: 10 });
  for (let i = 0; i < 6; i++) assert.equal((await s.h(req())).status, 200);
  assert.equal(s.keys.size, s.count());
});
test("regression: a second inner limiter would waste a non-refundable slot", async () => {
  let n = 0;
  const s = setup({
    limit: 10,
    innerTake: () =>
      ++n <= 3 ? { allowed: true } : { allowed: false, retryAfter: 60 },
  });
  for (let i = 0; i < 4; i++) await s.h(req());
  assert.equal(s.count(), 3);
  assert.equal(s.keys.size, 4);
});
test("a client that stalls the request body is cut off before any budget slot is claimed", async () => {
  const s = setup({ limit: 10, bodyDeadlineMs: 50 });
  const stalled = new ReadableStream({ start() {} });
  const r = await s.h(
    new Request(origin + "/api/explain", {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: stalled,
      duplex: "half",
    }),
  );
  assert.equal(r.status, 408);
  assert.equal(s.keys.size, 0);
  assert.equal(s.count(), 0);
});

test("a client that trickles bytes cannot extend the body deadline", async () => {
  const s = setup({ limit: 10, bodyDeadlineMs: 120 });
  let i = 0;
  const trickle = new ReadableStream({
    async pull(c) {
      await new Promise((r) => setTimeout(r, 40));
      c.enqueue(new Uint8Array([32]));
      if (++i > 200) c.close();
    },
  });
  const t0 = Date.now();
  const r = await s.h(
    new Request(origin + "/api/explain", {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: trickle,
      duplex: "half",
    }),
  );
  assert.equal(r.status, 408);
  assert(Date.now() - t0 < 1000);
  assert.equal(s.keys.size, 0);
});
