// Guards the TLS seam.
//
// node-postgres gives a URL's `sslmode` precedence over the `ssl` option object, silently. If
// sslmode survives into the Pool config, `rejectUnauthorized: true` and DB_CA_BUNDLE_PATH stop
// having any effect — the connection may still be encrypted, but nothing the code says about
// verification is true any more. These tests exist so that never regresses unnoticed.

import assert from "node:assert/strict";
import { test } from "node:test";

import { stripSslParams } from "./ssl.ts";

test("sslmode is removed so the explicit ssl option governs", () => {
  const out = stripSslParams("postgres://u:p@host.neon.tech/neondb?sslmode=require");
  assert.equal(out.includes("sslmode"), false);
  assert.ok(out.startsWith("postgres://u:p@host.neon.tech/neondb"));
});

test("every libpq ssl file parameter is removed", () => {
  const out = stripSslParams(
    "postgres://u:p@h/db?sslmode=verify-full&sslrootcert=system&sslcert=a.pem&sslkey=b.pem"
  );
  for (const p of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
    assert.equal(out.includes(p), false, `${p} should be gone`);
  }
});

test("unrelated query parameters survive", () => {
  const out = stripSslParams("postgres://u:p@h/db?sslmode=require&application_name=course&x=1");
  assert.ok(out.includes("application_name=course"));
  assert.ok(out.includes("x=1"));
  assert.equal(out.includes("sslmode"), false);
});

test("credentials and database are untouched", () => {
  const out = stripSslParams("postgres://course_app_user:p%40ss@h.example/neondb?sslmode=require");
  const url = new URL(out);
  assert.equal(url.username, "course_app_user");
  assert.equal(decodeURIComponent(url.password), "p@ss");
  assert.equal(url.pathname, "/neondb");
});

test("a URL with no ssl parameters is unchanged in substance", () => {
  const out = stripSslParams("postgres://u:p@h/db");
  assert.equal(new URL(out).host, "h");
  assert.equal(new URL(out).pathname, "/db");
});

test("a non-URL libpq string is passed through rather than mangled", () => {
  const kv = "host=localhost user=u dbname=db sslmode=require";
  assert.equal(stripSslParams(kv), kv);
});
