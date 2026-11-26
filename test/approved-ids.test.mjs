import test from "node:test";
import assert from "node:assert/strict";
import { approvedIds, isApprovedId } from "../server/approved-ids.mjs";
import { createTrialBudget } from "../server/trial-budget.mjs";
const A = "aaaaaaaa-1111-2222-3333-444444444444";
const B = "bbbbbbbb-1111-2222-3333-444444444444";
test("approved IDs parse a list and reject malformed or oversized input", () => {
  assert.deepEqual(approvedIds(` ${A}, ${B} `), [A, B]);
  assert.deepEqual(approvedIds("bad id"), []);
  assert.deepEqual(approvedIds(`${A},bad id`), []);
  assert.deepEqual(approvedIds(Array(21).fill(A).join(",")), []);
  assert.deepEqual(approvedIds(undefined), []);
  assert.equal(isApprovedId(`${A},${B}`, B), true);
  assert.equal(isApprovedId(A, B), false);
});
test("several approved accounts share one finite global budget", async () => {
  const keys = new Set();
  const reserve = createTrialBudget({
    store: {
      setJSON: async (k) =>
        keys.has(k) ? { modified: false } : (keys.add(k), { modified: true }),
    },
    campaign: "trial-allowlist-test",
    limit: 2,
    expiresAt: 2000,
    allowedUserId: `${A},${B}`,
    now: () => 1000,
  });
  assert.equal((await reserve({ id: A })).allowed, true);
  assert.equal((await reserve({ id: B })).allowed, true);
  assert.equal((await reserve({ id: A })).allowed, false);
  assert.equal((await reserve({ id: B })).allowed, false);
  assert.equal(
    (await reserve({ id: "cccccccc-1111-2222-3333-444444444444" })).reason,
    "not-approved",
  );
  assert.equal(keys.size, 2);
});
