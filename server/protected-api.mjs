import { validateExplain } from "./ai.mjs";
import { CITIES } from "../src/air-data.mjs";
import { judgePolicy, sameOrigin } from "./judge-policy.mjs";
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  Vary: "Cookie, Authorization",
};
export function createProtectedApi({
  bodyDeadlineMs = 5000,
  getUser,
  getAccess,
  forecast,
  explain,
  now = () => Date.now(),
  explainEnabled = () => true,
  reserveExplain = async () => ({ allowed: false }),
  runProbe = null,
  take = () => ({ allowed: true }),
}) {
  return async (request, context) => {
    const out = (status, body, extra = {}) =>
      Response.json(body, { status, headers: { ...headers, ...extra } });
    try {
      const path = new URL(request.url).pathname;
      if (
        ![
          "/api/forecast",
          "/api/explain",
          "/api/session",
          "/api/storage-probe",
        ].includes(path)
      )
        return out(404, { error: "Not found" });
      const method = ["/api/explain", "/api/storage-probe"].includes(path)
        ? "POST"
        : "GET";
      if (request.method !== method)
        return out(405, { error: "Method not allowed" }, { Allow: method });
      if (
        method === "POST" &&
        !sameOrigin(request.url, request.headers.get("origin"))
      )
        return out(403, { error: "Origin rejected" });
      const identity = await getUser(request);
      if (!identity?.email || !identity.confirmedAt)
        return out(401, { error: "Sign in required" });
      const access = await getAccess(
        identity.email.toLowerCase(),
        identity,
        context,
      );
      const policy = judgePolicy({
        identity: { email: identity.email, confirmed: true },
        verified: true,
        allowedEmails: access ? [identity.email] : [],
        revokedEmails: access?.revoked ? [identity.email] : [],
        expiresAt: access?.expiresAt,
        now: now(),
        adultApproved: access?.adultApproved === true,
        regionEligible:
          path !== "/api/explain" ||
          explainEnabled() !== true ||
          access?.regionEligible === true,
      });
      if (!policy.allowed)
        return out(403, { error: "Access not approved or expired" });
      if (path === "/api/storage-probe") {
        if (!runProbe) return out(404, { error: "Not found" });
        return out(200, await runProbe(identity));
      }
      if (path === "/api/session")
        return out(200, {
          authenticated: true,
          aiEnabled: explainEnabled() === true,
        });
      if (path === "/api/explain" && !explainEnabled())
        return out(503, {
          status: "unavailable",
          reason: "Live AI disabled; deterministic planner remains available",
        });
      if (path === "/api/explain" && access.regionEligible !== true)
        return out(403, { error: "Model access eligibility not established" });
      const slot = take(identity.id);
      if (!slot.allowed)
        return out(
          429,
          { error: "Try later" },
          { "Retry-After": String(slot.retryAfter || 60) },
        );
      if (path === "/api/forecast") {
        const url = new URL(request.url);
        if (
          [...url.searchParams.keys()].some((k) => k !== "city") ||
          url.searchParams.getAll("city").length !== 1
        )
          return out(400, { error: "One supported city required" });
        const city = url.searchParams.get("city");
        if (!Object.keys(CITIES).includes(city))
          return out(400, { error: "Unsupported city" });
        return out(200, { ...(await forecast(city)), city });
      }
      const chunks = [];
      let size = 0;
      const reader = request.body?.getReader();
      // One absolute deadline for the whole body, so trickling bytes cannot extend it.
      const bodyEndsAt = Date.now() + bodyDeadlineMs;
      if (reader)
        while (true) {
          let timer;
          const next = await Promise.race([
            reader.read(),
            new Promise((resolve) => {
              timer = setTimeout(
                () => resolve(null),
                Math.max(0, bodyEndsAt - Date.now()),
              );
            }),
          ]);
          clearTimeout(timer);
          if (next === null) {
            await reader.cancel().catch(() => {});
            return out(408, { error: "Request timed out" });
          }
          const { value, done } = next;
          if (done) break;
          size += value.byteLength;
          if (size > 1024) {
            await reader.cancel().catch(() => {});
            return out(413, { error: "Request too large" });
          }
          chunks.push(value);
        }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      if (
        (request.headers.get("content-type") || "")
          .split(";")[0]
          .trim()
          .toLowerCase() !== "application/json"
      )
        return out(415, { status: "unavailable", reason: "JSON required" });
      const bodyText = new TextDecoder().decode(bytes);
      let parsed;
      try {
        parsed = validateExplain(JSON.parse(bodyText));
      } catch {
        return out(400, {
          status: "unavailable",
          reason: "Only approved generic actions and language are accepted",
        });
      }
      const budget = await reserveExplain(identity);
      if (!budget?.allowed)
        return out(429, {
          status: "unavailable",
          reason: "Approved trial budget unavailable or exhausted",
        });
      const result = await explain({
        method: request.method,
        contentType: request.headers.get("content-type") || "",
        body: bodyText,
      });
      return out(result.status, result.body, result.headers);
    } catch {
      return out(503, { error: "Temporarily unavailable" });
    }
  };
}
