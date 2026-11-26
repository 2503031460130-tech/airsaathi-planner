// Private policy preparation only. Not an authentication implementation.
// A deployed host must first verify the provider-signed token server-side.
export function judgePolicy({
  identity,
  verified = false,
  allowedEmails = [],
  revokedEmails = [],
  expiresAt,
  now = Date.now(),
  regionEligible = false,
  adultApproved = false,
} = {}) {
  const deny = (reason) => ({ allowed: false, reason });
  if (!verified || !identity || typeof identity.email !== "string")
    return deny("unauthenticated");
  const email = identity.email.toLowerCase().trim();
  if (!identity.confirmed) return deny("unconfirmed");
  if (!Number.isFinite(expiresAt) || now >= expiresAt) return deny("expired");
  if (revokedEmails.map((x) => x.toLowerCase()).includes(email))
    return deny("revoked");
  if (!allowedEmails.map((x) => x.toLowerCase()).includes(email))
    return deny("not-approved");
  // Must come from trusted server configuration, never client self-assertion.
  if (!adultApproved || !regionEligible)
    return deny("eligibility-not-established");
  return { allowed: true, email };
}
export function sameOrigin(requestUrl, origin) {
  try {
    const o = new URL(origin);
    const local = ["localhost", "127.0.0.1"].includes(o.hostname);
    return (
      new URL(requestUrl).origin === o.origin &&
      (o.protocol === "https:" || (o.protocol === "http:" && local))
    );
  } catch {
    return false;
  }
}
