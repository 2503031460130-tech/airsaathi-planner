import test from "node:test";
import assert from "node:assert/strict";
import { judgePolicy, sameOrigin } from "../server/judge-policy.mjs";
const valid = () => ({
  identity: { email: "judge@example.invalid", confirmed: true },
  verified: true,
  allowedEmails: ["judge@example.invalid"],
  revokedEmails: [],
  expiresAt: 2000,
  now: 1000,
  regionEligible: true,
  adultApproved: true,
});
test("judge policy requires verified provider identity", () => {
  const x = valid();
  x.verified = false;
  assert.equal(judgePolicy(x).allowed, false);
  assert.equal(judgePolicy({}).allowed, false);
});
test("judge policy accepts only explicitly approved adult eligible identity", () => {
  assert.equal(judgePolicy(valid()).allowed, true);
  for (const key of ["regionEligible", "adultApproved"]) {
    const x = valid();
    x[key] = false;
    assert.equal(judgePolicy(x).allowed, false);
  }
});
test("judge policy denies revoked users even if token remains valid", () => {
  const x = valid();
  x.revokedEmails = ["judge@example.invalid"];
  assert.equal(judgePolicy(x).reason, "revoked");
});
test("judge policy denies expired and absent access lifetime", () => {
  for (const expiry of [undefined, 999, 1000, NaN]) {
    const x = valid();
    x.expiresAt = expiry;
    assert.equal(judgePolicy(x).allowed, false);
  }
});
test("judge policy denies unconfirmed and unlisted users", () => {
  const x = valid();
  x.identity.confirmed = false;
  assert.equal(judgePolicy(x).reason, "unconfirmed");
  x.identity.confirmed = true;
  x.allowedEmails = [];
  assert.equal(judgePolicy(x).reason, "not-approved");
});
test("origin policy denies absent and cross-origin state changes", () => {
  assert(sameOrigin("https://app.invalid/login", "https://app.invalid"));
  assert(!sameOrigin("https://app.invalid/login", "https://evil.invalid"));
  assert(!sameOrigin("https://app.invalid/login", undefined));
  assert(!sameOrigin("https://app.invalid/login", "null"));
  assert(!sameOrigin("http://app.invalid/x", "http://app.invalid"));
  assert(sameOrigin("http://localhost:8888/x", "http://localhost:8888"));
});
