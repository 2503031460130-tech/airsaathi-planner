/**
 * Countries restricted from free-tier Gemini API access under Gemini API terms.
 * Covers the EEA, Switzerland, and the United Kingdom.
 * Note: IP-based geolocation is an approximation; VPNs and cloud IPs may bypass detection.
 * @type {ReadonlySet<string>}
 */
export const RESTRICTED_COUNTRIES = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO CH GB".split(
    " ",
  ),
);

/**
 * Extracts a two-letter ISO 3166-1 country code from the Netlify geolocation context.
 *
 * @param {any} context - Netlify function context object with geo.country.code
 * @returns {string} Uppercase two-letter country code, or empty string if unavailable
 */
export function countryFromContext(context) {
  const c = context?.geo?.country?.code;
  return typeof c === "string" && /^[A-Za-z]{2}$/.test(c)
    ? c.toUpperCase()
    : "";
}

/**
 * Determines whether the request origin's country is eligible for free-tier AI features.
 * Returns false if the country is unknown (empty), so eligibility fails closed.
 *
 * @param {any} context - Netlify function context object
 * @returns {boolean} True only if country is known and not in the restricted set
 */
export function regionAllowed(context) {
  const c = countryFromContext(context);
  return c !== "" && !RESTRICTED_COUNTRIES.has(c);
}
