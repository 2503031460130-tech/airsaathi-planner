import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimit } from "../server/rate-limit.mjs";
import { createHandler } from "../server/handler.mjs";
test("burst guard permits only configured requests in window", () => {
  const take = createRateLimit({ limit: 2 });
  assert(take().allowed);
  assert(take().allowed);
  assert.equal(take().allowed, false);
});
test("window reset permits later request", () => {
  let time = 0;
  const take = createRateLimit({ now: () => time, limit: 1 });
  take();
  assert(!take().allowed);
  time = 60000;
  assert(take().allowed);
});
test("clock rollback does not cause permanent lockout", () => {
  let time = 100;
  const take = createRateLimit({ now: () => time, limit: 1 });
  take();
  time = 1;
  assert(take().allowed);
});
test("throttled handler never reads key or invokes model", async () => {
  let hits = 0;
  const h = createHandler({
    enabled: () => true,
    take: () => ({ allowed: false, retryAfter: 30 }),
    getKey: () => {
      hits++;
    },
    generate: async () => {
      hits++;
    },
  });
  const r = await h({
    method: "POST",
    body: JSON.stringify({ actionIds: ["no-idling"], language: "en" }),
  });
  assert.equal(r.status, 429);
  assert.equal(r.headers["Retry-After"], "30");
  assert.equal(hits, 0);
});
