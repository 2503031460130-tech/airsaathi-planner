import test from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../server/handler.mjs";
const body = JSON.stringify({ actionIds: ["no-idling"], language: "en" });
test("AI disabled means no credential access or generation", async () => {
  let calls = 0;
  const h = createHandler({
    enabled: () => false,
    getKey: () => {
      calls++;
      return "not-real";
    },
    generate: async () => {
      calls++;
    },
  });
  const r = await h({ method: "POST", body });
  assert.equal(r.status, 503);
  assert.equal(calls, 0);
});
test("wrong method rejected", async () =>
  assert.equal((await createHandler()({ method: "GET", body })).status, 405));
test("wrong content type rejected", async () =>
  assert.equal(
    (await createHandler()({ method: "POST", body, contentType: "text/plain" }))
      .status,
    415,
  ));
test("body over limit refused before parsing", async () =>
  assert.equal(
    (await createHandler()({ method: "POST", body: "x".repeat(1025) })).status,
    413,
  ));
test("malformed JSON refused", async () =>
  assert.equal(
    (await createHandler()({ method: "POST", body: "{" })).status,
    400,
  ));
test("personal input refused before credential access", async () => {
  let used = false;
  const r = await createHandler({
    getKey: () => {
      used = true;
    },
  })({
    method: "POST",
    body: JSON.stringify({
      actionIds: ["no-idling"],
      language: "en",
      budget: 100,
    }),
  });
  assert.equal(r.status, 400);
  assert.equal(used, false);
});
test("mock integration response returns no secret", async () => {
  const h = createHandler({
    enabled: () => true,
    getKey: () => "TEST_ONLY",
    generate: async (input, { key }) => {
      assert.equal(key, "TEST_ONLY");
      return {
        status: "generated",
        explanations: [{ id: input.actionIds[0], text: "General explanation" }],
      };
    },
  });
  const r = await h({ method: "POST", body });
  assert.equal(r.status, 200);
  assert(!JSON.stringify(r).includes("TEST_ONLY"));
  assert.equal(r.headers["Cache-Control"], "no-store");
});
