import { approvedIds, isApprovedId } from "./approved-ids.mjs";
// One-shot Blobs semantics probe, run inside the deployed function runtime. Writes only {probeAt}.
// Disabled unless explicitly configured; owner-only; runs once per campaign (immutable done-marker).
export function createStorageProbe({
  store,
  campaign,
  allowedUserId,
  attempts = 20,
  now = () => Date.now(),
}) {
  if (
    !store ||
    !/^probe-[a-z0-9-]{6,60}$/.test(campaign) ||
    approvedIds(allowedUserId).length === 0 ||
    !Number.isInteger(attempts) ||
    attempts < 2 ||
    attempts > 20
  )
    throw Error("Invalid probe configuration");
  return async (identity) => {
    if (!isApprovedId(allowedUserId, identity?.id))
      return { ran: false, reason: "not-approved" };
    const marker = await store
      .setJSON(`${campaign}/done`, { at: now() }, { onlyIfNew: true })
      .catch(() => null);
    if (marker?.modified !== true)
      return { ran: false, reason: "already-run-or-unavailable" };
    const key = `${campaign}/race`;
    const results = await Promise.all(
      Array.from({ length: attempts }, () =>
        store.setJSON(key, { probeAt: now() }, { onlyIfNew: true }).then(
          (r) => r?.modified,
          () => "error",
        ),
      ),
    );
    const again = await store
      .setJSON(key, { probeAt: now() }, { onlyIfNew: true })
      .then(
        (r) => r?.modified,
        () => "error",
      );
    await store.delete(key).catch(() => {});
    const wins = results.filter((x) => x === true).length,
      losses = results.filter((x) => x === false).length,
      errors = attempts - wins - losses;
    return {
      ran: true,
      attempts,
      wins,
      losses,
      errors,
      laterSequentialModified: again,
      passed:
        wins === 1 &&
        losses === attempts - 1 &&
        errors === 0 &&
        again === false,
    };
  };
}
