// Gemini API terms: only Paid Services may serve users in the EEA, Switzerland and the UK. This route is on the free quota,
// so those countries are refused per request. The country comes from the host's IP geolocation (Netlify context.geo.country.code).
// It is an approximation (VPNs, proxies, cloud IPs), not proof of the user's location and not a compliance guarantee.
export const RESTRICTED_COUNTRIES = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO CH GB".split(
    " ",
  ),
);
export function countryFromContext(context) {
  const c = context?.geo?.country?.code;
  return typeof c === "string" && /^[A-Za-z]{2}$/.test(c)
    ? c.toUpperCase()
    : "";
}
export function regionAllowed(context) {
  const c = countryFromContext(context);
  return c !== "" && !RESTRICTED_COUNTRIES.has(c);
}
