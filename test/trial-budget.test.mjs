import test from "node:test";
import assert from "node:assert/strict";
import { createTrialBudget } from "../server/trial-budget.mjs";
function setup(overrides = {}) {
  const keys = new Set(),
    records = [];
  const store = {
    setJSON: async (k, v, o) => {
      await Promise.resolve();
      assert.equal(o.onlyIfNew, true);
      if (keys.has(k)) return { modified: false };
      keys.add(k);
      records.push(v);
      return { modified: true };
    },
  };
  return {
    keys,
    records,
    take: createTrialBudget({
      store,
      campaign: "trial-private-owner-v1",
      limit: 2,
      expiresAt: 2000,
      allowedUserId: "fictional-owner",
      now: () => 1000,
      ...overrides,
    }),
  };
}
const owner = { id: "fictional-owner" };
test("concurrent instances share a strict finite request count", async () => {
  const s = setup();
  const results = await Promise.all(
    Array.from({ length: 50 }, () => s.take(owner)),
  );
  assert.equal(results.filter((x) => x.allowed).length, 2);
  assert.equal(s.keys.size, 2);
});
test("wrong user and expired owner cannot claim storage slots", async () => {
  const s = setup();
  assert.equal((await s.take({ id: "other" })).allowed, false);
  assert.equal(s.keys.size, 0);
  const e = setup({ now: () => 2000 });
  assert.equal((await e.take(owner)).allowed, false);
  assert.equal(e.keys.size, 0);
});
test("provider failure is not refundable", async () => {
  const s = setup();
  await s.take(owner);
  await s.take(owner);
  assert.equal((await s.take(owner)).reason, "budget-exhausted");
});
test("storage outage or ambiguous response cannot permit generation", async () => {
  for (const store of [
    {
      setJSON: async () => {
        throw Error("outage");
      },
    },
    { setJSON: async () => ({}) },
  ]) {
    const s = setup({ store });
    assert.equal((await s.take(owner)).reason, "budget-unavailable");
  }
});
test("slots contain no user identity or prompts", async () => {
  const s = setup();
  await s.take(owner);
  assert.deepEqual(Object.keys(s.records[0]), ["claimedAt"]);
});
test("malformed scope cannot silently create open-ended budget", () => {
  for (const opts of [
    { limit: 0 },
    { limit: 100 },
    { campaign: "unscoped" },
    { allowedUserId: "" },
  ])
    assert.throws(() => setup(opts));
});
