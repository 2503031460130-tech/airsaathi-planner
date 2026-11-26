import test from "node:test";
import assert from "node:assert/strict";
import {
  regionAllowed,
  countryFromContext,
  RESTRICTED_COUNTRIES,
} from "../server/region.mjs";
test("region gate: EEA, Switzerland, UK and unknown or malformed countries are refused; others allowed", () => {
  for (const c of [
    "DE",
    "FR",
    "IT",
    "ES",
    "NL",
    "PL",
    "SE",
    "IS",
    "LI",
    "NO",
    "CH",
    "GB",
    "de",
    "Gb",
  ])
    assert.equal(regionAllowed({ geo: { country: { code: c } } }), false, c);
  for (const bad of [
    undefined,
    null,
    {},
    { geo: {} },
    { geo: { country: {} } },
    { geo: { country: { code: "" } } },
    { geo: { country: { code: "DEU" } } },
    { geo: { country: { code: 5 } } },
  ])
    assert.equal(regionAllowed(bad), false);
  for (const c of ["IN", "US", "SG", "JP", "AU"])
    assert.equal(regionAllowed({ geo: { country: { code: c } } }), true, c);
  assert.equal(countryFromContext({ geo: { country: { code: "in" } } }), "IN");
});
test("restricted list covers all 27 EU states plus Iceland, Liechtenstein, Norway, Switzerland, UK", () => {
  const eu =
    "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(
      " ",
    );
  assert.equal(eu.length, 27);
  for (const c of [...eu, "IS", "LI", "NO", "CH", "GB"])
    assert.ok(RESTRICTED_COUNTRIES.has(c), c);
  assert.equal(RESTRICTED_COUNTRIES.size, 32);
});
