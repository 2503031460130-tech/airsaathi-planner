import { readCapped } from "./bounded-body.mjs";
// Verify the browser credential with GoTrue, never trust decoded JWT claims.
// /user loads the current database user and server-managed roles on every call.
export function createIdentityVerifier({ siteUrl, fetchImpl = fetch }) {
  const site = new URL(siteUrl);
  if (site.protocol !== "https:" || site.username || site.password)
    throw Error("HTTPS Identity origin required");
  const endpoint = new URL("/.netlify/identity/user", site.origin).href;
  return async (request) => {
    const matches = (request.headers.get("cookie") || "")
      .split(";")
      .map((x) => x.trim())
      .filter((x) => x.startsWith("nf_jwt="));
    if (matches.length !== 1) return null;
    let token;
    try {
      token = decodeURIComponent(matches[0].slice(7));
    } catch {
      return null;
    }
    if (!token || token.length > 12000 || !/^[-A-Za-z0-9_.]+$/.test(token))
      return null;
    const res = await fetchImpl(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(6000),
    });
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw Error("Identity unavailable");
    let u;
    try {
      u = JSON.parse(await readCapped(res, 20000));
    } catch {
      throw Error("Identity unavailable");
    }
    if (!u || typeof u !== "object") return null;
    if (
      !/^[0-9a-f-]{36}$/i.test(u.id || "") ||
      typeof u.email !== "string" ||
      !u.confirmed_at
    )
      return null;
    return {
      id: u.id,
      email: u.email,
      confirmedAt: u.confirmed_at,
      appMetadata: u.app_metadata || {},
    };
  };
}
export function accessFromVerifiedUser(identity) {
  const roles = identity.appMetadata?.roles;
  if (!Array.isArray(roles)) return null;
  const grants = roles.filter(
    (x) =>
      typeof x === "string" && /^airsaathi-eval-adult-until-\d{13}$/.test(x),
  );
  if (grants.length !== 1 || roles.includes("airsaathi-revoked")) return null;
  return {
    expiresAt: Number(grants[0].split("-").at(-1)),
    adultApproved: true,
    regionEligible: false,
    revoked: false,
  };
}
