/**
 * Parses and validates a comma-separated list of approved identity IDs.
 * Guards against oversized lists, invalid characters, and injection attempts.
 * Note: Multiple IDs share the same finite global budget — they do not multiply it.
 *
 * @param {unknown} value - Raw comma-separated identity ID string from configuration
 * @returns {string[]} Validated array of approved IDs, or empty array if input is invalid
 */
export function approvedIds(value) {
  if (typeof value !== "string") return [];
  const ids = value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return ids.length <= 20 && ids.every((x) => /^[A-Za-z0-9-]{1,64}$/.test(x))
    ? ids
    : [];
}
/**
 * Checks whether a specific identity ID is present in the approved list.
 *
 * @param {unknown} value - Raw comma-separated approved identity ID string
 * @param {unknown} id - Identity ID to check
 * @returns {boolean} True if the ID is in the approved list
 */
export const isApprovedId = (value, id) =>
  typeof id === "string" && approvedIds(value).includes(id);
