// The approved-account setting is a comma-separated list of verified identity IDs (usually one owner).
// More than one ID never adds budget: every ID draws from the same finite global slots.
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
export const isApprovedId = (value, id) =>
  typeof id === "string" && approvedIds(value).includes(id);
