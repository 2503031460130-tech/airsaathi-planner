import {
  createIdentityVerifier,
  accessFromVerifiedUser,
} from "../../server/identity-verify.mjs";
import { createProtectedApi } from "../../server/protected-api.mjs";
import { createOpenWeatherLoader } from "../../server/openweather.mjs";
import { createHandler } from "../../server/handler.mjs";
import { isApprovedId } from "../../server/approved-ids.mjs";
import { regionAllowed } from "../../server/region.mjs";
import { createRateLimit } from "../../server/rate-limit.mjs";
import { getStore } from "@netlify/blobs";
import { createStorageProbe } from "../../server/storage-probe.mjs";
import { prepareTrial } from "../../server/trial-storage.mjs";
import { isValidTrialConfig } from "../../server/trial-budget.mjs";
const forecast = createOpenWeatherLoader({
  getKey: () => process.env.OPENWEATHER_API_KEY,
});
const take = createRateLimit({ limit: 12 });
const getUser = createIdentityVerifier({ siteUrl: process.env.URL });
// Live AI stays off unless every trial setting is present and AIRSAATHI_AI_ENABLED is 'true'. Default: off.
function trialConfig(env = process.env) {
  if (env.AIRSAATHI_AI_ENABLED !== "true") return null;
  const limit = Number(env.AIRSAATHI_TRIAL_LIMIT),
    expiresAt = Number(env.AIRSAATHI_TRIAL_EXPIRES_AT);
  const cfg = {
    enabled: true,
    campaign: env.AIRSAATHI_TRIAL_CAMPAIGN,
    allowedUserId: env.AIRSAATHI_TRIAL_OWNER_ID,
    limit,
    expiresAt,
  };
  return isValidTrialConfig(cfg) ? cfg : null;
}
const reserveExplain = async (identity) => {
  try {
    return await prepareTrial({ getStore, approvedConfig: trialConfig() })(
      identity,
    );
  } catch {
    return { allowed: false, reason: "budget-unavailable" };
  }
};
function probeConfig(env = process.env) {
  return env.AIRSAATHI_PROBE_CAMPAIGN && env.AIRSAATHI_TRIAL_OWNER_ID
    ? {
        campaign: env.AIRSAATHI_PROBE_CAMPAIGN,
        allowedUserId: env.AIRSAATHI_TRIAL_OWNER_ID,
      }
    : null;
}
const runProbe = async (identity) => {
  const c = probeConfig();
  if (!c) return { ran: false, reason: "not-configured" };
  try {
    return await createStorageProbe({
      store: getStore({
        name: "airsaathi-storage-probe",
        consistency: "strong",
      }),
      ...c,
    })(identity);
  } catch {
    return { ran: false, reason: "unavailable" };
  }
};
const handle = createProtectedApi({
  runProbe,
  getUser,
  explainEnabled: () => trialConfig() !== null,
  reserveExplain,
  getAccess: async (email, identity, context) => {
    const a = accessFromVerifiedUser(identity),
      c = trialConfig();
    return a &&
      c &&
      isApprovedId(c.allowedUserId, identity.id) &&
      regionAllowed(context)
      ? { ...a, regionEligible: true }
      : a;
  },
  forecast: async (city) => {
    if (process.env.AIRSAATHI_FORECAST_ENABLED !== "true")
      throw Error("Disabled");
    return forecast(city);
  },
  // The protected API already limits per user before the durable budget is claimed.
  // A second inner limiter could reject after a non-refundable slot was spent.
  explain: createHandler({ take: () => ({ allowed: true }) }),
  take,
});
export default handle;
export const config = {
  path: ["/api/forecast", "/api/explain", "/api/session", "/api/storage-probe"],
  rateLimit: {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
    action: "rate_limit",
  },
};
