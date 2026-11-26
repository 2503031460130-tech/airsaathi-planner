import test from "node:test";
import assert from "node:assert/strict";
import { createStorageProbe } from "../server/storage-probe.mjs";
const mk = () => {
  const m = new Map();
  return {
    m,
    setJSON: async (k, v, o) => {
      await Promise.resolve();
      if (o?.onlyIfNew && m.has(k)) return { modified: false };
      m.set(k, v);
      return { modified: true };
    },
    delete: async (k) => {
      m.delete(k);
    },
  };
};
test("atomic store passes: 1 win, N-1 losses, key removed, runs once", async () => {
  const s = mk(),
    p = createStorageProbe({
      store: s,
      campaign: "probe-test-1",
      allowedUserId: "u",
    });
  const r = await p({ id: "u" });
  assert.deepEqual([r.passed, r.wins, r.losses, r.errors], [true, 1, 19, 0]);
  assert.equal(s.m.has("probe-test-1/race"), false);
  assert.equal((await p({ id: "u" })).ran, false);
});
test("non-atomic store fails the probe", async () => {
  const s = {
    setJSON: async (k, v, o) =>
      k.endsWith("done") ? { modified: true } : { modified: true },
    delete: async () => {},
  };
  assert.equal(
    (
      await createStorageProbe({
        store: s,
        campaign: "probe-test-2",
        allowedUserId: "u",
      })({ id: "u" })
    ).passed,
    false,
  );
});
test("wrong user and bad config refused", async () => {
  const p = createStorageProbe({
    store: mk(),
    campaign: "probe-test-3",
    allowedUserId: "u",
  });
  assert.equal((await p({ id: "x" })).ran, false);
  assert.throws(() =>
    createStorageProbe({ store: mk(), campaign: "bad", allowedUserId: "u" }),
  );
});
