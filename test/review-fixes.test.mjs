import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimit } from "../server/rate-limit.mjs";
import { explain, validateResponse } from "../server/ai.mjs";
import { judgePolicy } from "../server/judge-policy.mjs";
test("rate limit is per user key", () => {
  const take = createRateLimit({ limit: 1 });
  assert(take("a").allowed);
  assert(!take("a").allowed);
  assert(take("b").allowed);
});
test("rate limit bucket count is bounded", () => {
  const take = createRateLimit({ limit: 1, maxKeys: 2 });
  take("a");
  take("b");
  assert.equal(take("c").allowed, false);
});
test("policy denies when region not eligible", () => {
  const p = judgePolicy({
    identity: { email: "x@example.invalid", confirmed: true },
    verified: true,
    allowedEmails: ["x@example.invalid"],
    expiresAt: Date.now() + 1e5,
    adultApproved: true,
    regionEligible: false,
  });
  assert.equal(p.allowed, false);
});
const ids = ["no-idling"];
const ok = {
  explanations: [
    { id: "no-idling", text: "Turn the engine off when waiting safely." },
  ],
};
test("english request rejects Hindi-script text", () =>
  assert.throws(() =>
    validateResponse(
      { explanations: [{ id: "no-idling", text: "इंजन बंद रखें जब रुकना हो।" }] },
      ids,
      "en",
    ),
  ));
test("hindi request rejects English-only text", () =>
  assert.throws(() => validateResponse(ok, ids, "hi")));
test("hindi request accepts Devanagari text", () =>
  assert.equal(
    validateResponse(
      { explanations: [{ id: "no-idling", text: "रुकते समय इंजन बंद रखें।" }] },
      ids,
      "hi",
    ).length,
    1,
  ));
test("oversized provider body rejected without model success", async () => {
  const body = JSON.stringify({
    candidates: [{ content: { parts: [{ text: "x".repeat(30000) }] } }],
  });
  const out = await explain(
    { actionIds: ids, language: "en" },
    {
      key: "TEST_ONLY",
      fetcher: async () => ({ ok: true, text: async () => body }),
    },
  );
  assert.equal(out.status, "unavailable");
});
test("declared content-length over limit rejected", async () => {
  const out = await explain(
    { actionIds: ids, language: "en" },
    {
      key: "TEST_ONLY",
      fetcher: async () => ({
        ok: true,
        headers: { get: () => "999999" },
        text: async () => "{}",
      }),
    },
  );
  assert.equal(out.status, "unavailable");
});

test("streamed oversize body is cancelled at the cap, not read to the end", async () => {
  let pulled = 0,
    cancelled = false;
  const chunk = new TextEncoder().encode("x".repeat(8000));
  const body = new ReadableStream({
    pull(ctl) {
      pulled++;
      if (pulled > 1000) {
        ctl.close();
        return;
      }
      ctl.enqueue(chunk);
    },
    cancel() {
      cancelled = true;
    },
  });
  const out = await explain(
    { actionIds: ["no-idling"], language: "en" },
    {
      key: "TEST_ONLY",
      fetcher: async () => new Response(body, { status: 200 }),
    },
  );
  assert.equal(out.status, "unavailable");
  assert.equal(cancelled, true);
  assert(pulled <= 5, "pulled " + pulled);
});
test("valid streamed response within the cap is accepted", async () => {
  const txt = JSON.stringify({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                explanations: [
                  {
                    id: "no-idling",
                    text: "Turn the engine off when waiting safely.",
                  },
                ],
              }),
            },
          ],
        },
      },
    ],
  });
  const out = await explain(
    { actionIds: ["no-idling"], language: "en" },
    { key: "TEST_ONLY", fetcher: async () => new Response(txt) },
  );
  assert.equal(out.status, "generated");
});
import { isValidTrialConfig } from "../server/trial-budget.mjs";
import { createIdentityVerifier } from "../server/identity-verify.mjs";
import { intervalScores } from "../src/forecast-plan.mjs";
import { createProtectedApi } from "../server/protected-api.mjs";
test("trial config validated in one place", () => {
  const ok = {
    campaign: "trial-abcdef",
    limit: 2,
    expiresAt: Date.now() + 1e5,
    allowedUserId: "u",
  };
  assert(isValidTrialConfig(ok));
  for (const bad of [
    { ...ok, limit: 0 },
    { ...ok, limit: 11 },
    { ...ok, limit: 1.5 },
    { ...ok, campaign: "x" },
    { ...ok, expiresAt: Date.now() - 1 },
    { ...ok, allowedUserId: "" },
  ])
    assert(!isValidTrialConfig(bad));
});
const idReq = () =>
  new Request("https://s.example.invalid/api/session", {
    headers: { cookie: "nf_jwt=abc.def.ghi" },
  });
test("identity: malformed or oversized provider body fails closed", async () => {
  for (const res of [
    new Response("not json", { status: 200 }),
    new Response("x".repeat(30000), { status: 200 }),
  ]) {
    const v = createIdentityVerifier({
      siteUrl: "https://s.example.invalid",
      fetchImpl: async () => res,
    });
    await assert.rejects(v(idReq()));
  }
});
test("forecast samples above provider bound rejected", () => {
  const rows = [{ validAt: "2026-11-26T00:00:00+05:30", pm: 6000 }];
  assert.throws(() => intervalScores({ rows }, "2026-11-26"));
});
test("protected API requires JSON content type before parsing", async () => {
  let b = 0;
  const h = createProtectedApi({
    getUser: async () => ({
      id: "f",
      email: "j@example.invalid",
      confirmedAt: "x",
    }),
    getAccess: async () => ({
      expiresAt: 2000,
      adultApproved: true,
      regionEligible: true,
    }),
    now: () => 1000,
    explainEnabled: () => true,
    reserveExplain: async () => {
      b++;
      return { allowed: true };
    },
    forecast: async () => ({}),
    explain: async () => ({ status: 200, body: {} }),
  });
  const post = (ct) =>
    new Request("https://a.invalid/api/explain", {
      method: "POST",
      headers: {
        origin: "https://a.invalid",
        ...(ct ? { "content-type": ct } : {}),
      },
      body: JSON.stringify({ actionIds: ["no-idling"], language: "en" }),
    });
  for (const ct of [
    undefined,
    "text/plain",
    "application/x-www-form-urlencoded",
  ])
    assert.equal((await h(post(ct))).status, 415);
  assert.equal(b, 0);
  assert.notEqual(
    (await h(post("application/json; charset=utf-8"))).status,
    415,
  );
});

test("identity stream is cancelled at the cap before full read", async () => {
  let pulled = 0,
    cancelled = false;
  const chunk = new TextEncoder().encode("x".repeat(8000));
  const body = new ReadableStream({
    pull(ctl) {
      pulled++;
      if (pulled > 1000) {
        ctl.close();
        return;
      }
      ctl.enqueue(chunk);
    },
    cancel() {
      cancelled = true;
    },
  });
  const v = createIdentityVerifier({
    siteUrl: "https://s.example.invalid",
    fetchImpl: async () => new Response(body, { status: 200 }),
  });
  await assert.rejects(v(idReq()));
  assert.equal(cancelled, true);
  assert(pulled <= 5, "pulled " + pulled);
});
