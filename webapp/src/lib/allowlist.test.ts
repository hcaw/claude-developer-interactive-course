import assert from "node:assert/strict";
import { test } from "node:test";

import { isAllowedDomain } from "./allowlist.ts";

const cfg = { domains: "stackdrop.co", emails: "contractor@gmail.com" };

test("domain members are allowed, case-insensitively", () => {
  assert.equal(isAllowedDomain("ahmed.ezzat@stackdrop.co", cfg), true);
  assert.equal(isAllowedDomain("Ahmed.Ezzat@Stackdrop.CO", cfg), true);
  assert.equal(isAllowedDomain("  ahmed@stackdrop.co  ", cfg), true);
});

test("explicitly listed addresses are allowed", () => {
  assert.equal(isAllowedDomain("contractor@gmail.com", cfg), true);
  assert.equal(isAllowedDomain("someone-else@gmail.com", cfg), false);
});

test("outsiders are rejected", () => {
  assert.equal(isAllowedDomain("attacker@evil.com", cfg), false);
  assert.equal(isAllowedDomain(null, cfg), false);
  assert.equal(isAllowedDomain(undefined, cfg), false);
  assert.equal(isAllowedDomain("", cfg), false);
  assert.equal(isAllowedDomain("not-an-email", cfg), false);
});

test("an empty domain config fails closed", () => {
  // A blank env var must never mean "everyone" — that is the shape a misconfigured deploy takes.
  assert.equal(isAllowedDomain("anyone@anywhere.com", { domains: "", emails: "" }), false);
  assert.equal(isAllowedDomain("anyone@anywhere.com", { domains: "  ", emails: " , " }), false);
});

test("a lookalike domain does not match", () => {
  // Suffix matching would let notstackdrop.co and stackdrop.co.evil.com through.
  assert.equal(isAllowedDomain("x@notstackdrop.co", cfg), false);
  assert.equal(isAllowedDomain("x@stackdrop.co.evil.com", cfg), false);
  assert.equal(isAllowedDomain("x@sub.stackdrop.co", cfg), false);
});

test("multiple domains and spacing are tolerated", () => {
  const multi = { domains: " stackdrop.co , example.com ", emails: "" };
  assert.equal(isAllowedDomain("a@stackdrop.co", multi), true);
  assert.equal(isAllowedDomain("b@example.com", multi), true);
  assert.equal(isAllowedDomain("c@other.com", multi), false);
});

test("an email with multiple @ resolves on the last one", () => {
  assert.equal(isAllowedDomain('"weird@name"@stackdrop.co', cfg), true);
});
