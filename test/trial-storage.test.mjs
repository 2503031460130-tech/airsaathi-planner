import test from "node:test";
import assert from "node:assert/strict";
import { prepareTrial } from "../server/trial-storage.mjs";
test("unapproved configuration cannot touch storage", async () => {
  let calls = 0;
  const take = prepareTrial({
    getStore: () => {
      calls++;
    },
    approvedConfig: null,
  });
  assert.equal((await take({ id: "x" })).allowed, false);
  assert.equal(calls, 0);
});
test("prepared adapter requests strong shared store and survives warm reuse", async () => {
  const keys = new Set();
  let calls = 0;
  const take = prepareTrial({
    getStore: (options) => {
      calls++;
      assert.deepEqual(options, {
        name: "airsaathi-model-trials",
        consistency: "strong",
      });
      return {
        setJSON: async (k) => {
          if (keys.has(k)) return { modified: false };
          keys.add(k);
          return { modified: true };
        },
      };
    },
    approvedConfig: {
      enabled: true,
      campaign: "trial-offline-mock",
      limit: 2,
      expiresAt: Date.now() + 60000,
      allowedUserId: "mock",
    },
  });
  assert.equal((await take({ id: "mock" })).allowed, true);
  assert.equal((await take({ id: "mock" })).allowed, true);
  assert.equal((await take({ id: "mock" })).allowed, false);
  assert.equal(calls, 1);
});
