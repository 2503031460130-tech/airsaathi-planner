import { createTrialBudget } from "./trial-budget.mjs";

/**
 * Creates a lazy-initialized trial budget accessor backed by persistent Netlify Blobs storage.
 * The budget object is constructed on first use to avoid Blobs context errors during cold imports.
 * Production deployments should still set `enabled: false` via environment to prevent live spend.
 *
 * @param {object} params - Trial preparation parameters
 * @param {(opts: { name: string, consistency: string }) => object} params.getStore - Blobs store factory
 * @param {{ enabled: boolean, campaign: string, limit: number, expiresAt: number, allowedUserId: string } | null} params.approvedConfig - Immutable trial configuration
 * @returns {(identity: { id: string }) => Promise<{ allowed: boolean, reason?: string, slot?: number }>} Async budget accessor
 */
export function prepareTrial({ getStore, approvedConfig }) {
  if (!approvedConfig || approvedConfig.enabled !== true)
    return async () => ({ allowed: false, reason: "not-approved" });
  let budget;
  return async (identity) => {
    if (!budget) {
      const store = getStore({
        name: "airsaathi-model-trials",
        consistency: "strong",
      });
      budget = createTrialBudget({ store, ...approvedConfig });
    }
    return budget(identity);
  };
}
