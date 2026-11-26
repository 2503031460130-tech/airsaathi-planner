import { createTrialBudget } from "./trial-budget.mjs";
// Offline-prepared adapter. Production still passes explainEnabled:()=>false.
// Caller must provide reviewed immutable campaign, owner ID, expiry and request cap.
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
