// The domain gate: which organisation this deployment serves.
//
// This is the ONLY access rule that belongs in env. It is deployment configuration, it changes
// approximately never, and it is edge-safe — the proxy and the Auth.js `signIn` callback can apply
// it without a database. Per-person state (admin, revoked) lives in the database; see
// src/lib/access.ts and adr/2026-08-04-08.
//
// Pure functions taking their config explicitly, so they can be tested without touching env.

export type DomainConfig = {
  /** e.g. "stackdrop.co, example.com" */
  domains: string;
  /** Individual exceptions for contractors or personal accounts, e.g. "someone@gmail.com" */
  emails: string;
};

function split(list: string | undefined): string[] {
  return (list ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function domainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  return at > 0 ? email.slice(at + 1) : null;
}

/**
 * Whether an email is inside the organisational boundary.
 *
 * Deliberately fails closed: with neither var set, nobody gets in. An empty allowlist is far more
 * likely to be a misconfigured deployment than an intent to admit the whole internet.
 *
 * Matches are exact, never suffix — otherwise `notstackdrop.co` and `stackdrop.co.evil.com` pass.
 */
export function isAllowedDomain(
  email: string | null | undefined,
  config: DomainConfig = domainConfigFromEnv()
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;

  const domains = split(config.domains);
  const emails = split(config.emails);
  if (domains.length === 0 && emails.length === 0) return false;

  if (emails.includes(normalized)) return true;

  const domain = domainOf(normalized);
  return domain !== null && domains.includes(domain);
}

export function domainConfigFromEnv(): DomainConfig {
  return {
    domains: process.env.ALLOWED_EMAIL_DOMAINS ?? "",
    emails: process.env.ALLOWED_EMAILS ?? "",
  };
}
