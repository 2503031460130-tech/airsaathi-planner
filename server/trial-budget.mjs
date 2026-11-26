import { approvedIds, isApprovedId } from "./approved-ids.mjs";

/**
 * Validates trial budget campaign settings.
 * Single validation used by both function entry point and budget to prevent misconfiguration.
 *
 * @param {object} config - Trial budget configuration
 * @param {string} config.campaign - Unique campaign identifier
 * @param {number} config.limit - Maximum atomic slots allocated (1-10)
 * @param {number} config.expiresAt - Expiry epoch timestamp in ms
 * @param {string | string[]} config.allowedUserId - Allowlisted account ID(s)
 * @param {number} [now=Date.now()] - Current epoch timestamp
 * @returns {boolean} True if configuration meets all strict safety criteria
 */
export function isValidTrialConfig(
  { campaign, limit, expiresAt, allowedUserId },
  now = Date.now(),
) {
  return (
    /^trial-[a-z0-9-]{6,60}$/.test(campaign || "") &&
    Number.isInteger(limit) &&
    limit >= 1 &&
    limit <= 10 &&
    Number.isFinite(expiresAt) &&
    expiresAt > now &&
    approvedIds(allowedUserId).length > 0
  );
}

/**
 * Creates an atomic trial budget lock using shared persistent storage (Netlify Blobs).
 * Guarantees that concurrent serverless instances cannot exceed the finite generation quota.
 *
 * @param {object} params - Budget lock parameters
 * @param {any} params.store - Storage adapter with setJSON atomic primitives
 * @param {string} params.campaign - Campaign namespace
 * @param {number} params.limit - Max slots
 * @param {number} params.expiresAt - Expiration timestamp
 * @param {string | string[]} params.allowedUserId - Authorized judge/user ID
 * @param {() => number} [params.now] - Current timestamp supplier
 * @returns {(identity: any) => Promise<{ allowed: boolean, slot?: number, reason?: string }>}
 */
export function createTrialBudget({
  store,
  campaign,
  limit,
  expiresAt,
  allowedUserId,
  now = () => Date.now(),
}) {
  if (
    !store ||
    typeof store.setJSON !== "function" ||
    !/^trial-[a-z0-9-]{6,60}$/.test(campaign) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 10 ||
    !Number.isFinite(expiresAt) ||
    approvedIds(allowedUserId).length === 0
  )
    throw Error("Invalid approved trial configuration");
  return async (identity) => {
    if (!isApprovedId(allowedUserId, identity?.id) || now() >= expiresAt)
      return { allowed: false, reason: "not-approved" };
    try {
      for (let i = 0; i < limit; i++) {
        // Contains no email, routine, location, generated text or credential.
        const result = await store.setJSON(
          `${campaign}/slot-${i}`,
          { claimedAt: now() },
          { onlyIfNew: true },
        );
        if (result?.modified === true) return { allowed: true, slot: i };
        if (result?.modified !== false)
          return { allowed: false, reason: "budget-unavailable" };
      }
      return { allowed: false, reason: "budget-exhausted" };
    } catch {
      return { allowed: false, reason: "budget-unavailable" };
    }
  };
}
