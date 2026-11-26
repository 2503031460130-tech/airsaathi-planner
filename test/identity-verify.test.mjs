import test from "node:test";
import assert from "node:assert/strict";
import {
  createIdentityVerifier,
  accessFromVerifiedUser,
} from "../server/identity-verify.mjs";
const id = "11111111-2222-4333-8444-555555555555",
  email = "owner@example.invalid";
const good = {
  id,
  email,
  confirmed_at: "2026-11-24T10:08:31Z",
  app_metadata: { roles: ["airsaathi-eval-adult-until-1795528800000"] },
};
const req = (c) =>
  new Request("https://untrusted.example/api/session", {
    headers: { cookie: c },
  });
function setup(body = good, status = 200) {
  const calls = [];
  return {
    calls,
    verify: createIdentityVerifier({
      siteUrl: "https://airsaathi-test.example.invalid",
      fetchImpl: async (...args) => {
        calls.push(args);
        return Response.json(body, { status });
      },
    }),
  };
}
test("no credential, authorization-only or duplicate cookies deny without upstream", async () => {
  const { verify, calls } = setup();
  for (const cookie of ["", "other=abc", "nf_jwt=a; nf_jwt=b"])
    assert.equal(await verify(req(cookie)), null);
  assert.equal(
    await verify(
      new Request("https://x.invalid", {
        headers: { Authorization: "Bearer fake" },
      }),
    ),
    null,
  );
  assert.equal(calls.length, 0);
});
test("malformed or oversized credential denies without upstream", async () => {
  for (const cookie of [
    "nf_jwt=%xx",
    "nf_jwt=a%0Ab",
    "nf_jwt=" + "a".repeat(12001),
  ]) {
    const { verify, calls } = setup();
    assert.equal(await verify(req(cookie)), null);
    assert.equal(calls.length, 0);
  }
});
test("credential verified only at configured same-site Identity origin with no redirects/cache", async () => {
  const { verify, calls } = setup();
  const u = await verify(req("other=1; nf_jwt=one.two.three"));
  assert.equal(u.email, email);
  assert.ok(u.confirmedAt);
  assert.equal(
    calls[0][0],
    "https://airsaathi-test.example.invalid/.netlify/identity/user",
  );
  assert.equal(calls[0][1].headers.Authorization, "Bearer one.two.three");
  assert.equal(calls[0][1].redirect, "error");
  assert.equal(calls[0][1].cache, "no-store");
});
test("forged or expired token rejected by provider", async () => {
  for (const status of [401, 403]) {
    const { verify } = setup({}, status);
    assert.equal(await verify(req("nf_jwt=fake")), null);
  }
});
test("provider outage fails closed", async () => {
  const { verify } = setup({}, 500);
  await assert.rejects(verify(req("nf_jwt=one.two.three")));
});
test("unconfirmed or missing identity denies", async () => {
  for (const body of [
    { ...good, confirmed_at: null },
    { ...good, id: "" },
    { ...good, email: null },
  ]) {
    const { verify } = setup(body);
    assert.equal(await verify(req("nf_jwt=a.b.c")), null);
  }
});
test("fresh database roles update grants without JWT refresh", async () => {
  let body = good;
  const verify = createIdentityVerifier({
    siteUrl: "https://airsaathi-test.example.invalid",
    fetchImpl: async () => Response.json(body),
  });
  const r = req("nf_jwt=unchanged.token.value");
  assert.equal(accessFromVerifiedUser(await verify(r)).adultApproved, true);
  body = { ...good, app_metadata: { roles: [] } };
  assert.equal(accessFromVerifiedUser(await verify(r)), null);
});
test("only one admin-managed scoped adult role grants, never user metadata", () => {
  assert.equal(
    accessFromVerifiedUser({
      appMetadata: {},
      userMetadata: good.app_metadata,
    }),
    null,
  );
  for (const roles of [
    [],
    ["admin"],
    ["airsaathi-eval-adult-until-x"],
    [...good.app_metadata.roles, "airsaathi-revoked"],
    [...good.app_metadata.roles, ...good.app_metadata.roles],
  ])
    assert.equal(accessFromVerifiedUser({ appMetadata: { roles } }), null);
  const a = accessFromVerifiedUser({ appMetadata: good.app_metadata });
  assert.equal(a.expiresAt, 1795528800000);
  assert.equal(a.regionEligible, false);
});
test("expiry is enforced by protected API, exact boundary denied", async () => {
  const { createProtectedApi } = await import("../server/protected-api.mjs");
  const { verify } = setup();
  const getUser = (r) => verify(r);
  for (const now of [1795528800000, 1795528800001]) {
    const handler = createProtectedApi({
      getUser,
      getAccess: async (e, u) => accessFromVerifiedUser(u),
      now: () => now,
    });
    assert.equal(
      (
        await handler(
          new Request("https://x.invalid/api/session", {
            headers: { cookie: "nf_jwt=a.b.c" },
          }),
        )
      ).status,
      403,
    );
  }
});
test("HTTP destination refuses initialization", () =>
  assert.throws(() =>
    createIdentityVerifier({ siteUrl: "http://example.invalid" }),
  ));
