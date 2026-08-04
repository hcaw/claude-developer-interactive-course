/**
 * Remove libpq SSL parameters from a connection string.
 *
 * node-postgres gives a URL's `sslmode` precedence over the `ssl` option object — and silently.
 * With `?sslmode=require` present, `ssl: { rejectUnauthorized: true, ca }` is ignored outright:
 * verified empirically against Neon, a deliberately bogus CA still connected, and so did
 * `rejectUnauthorized: false`. That would make DB_CA_BUNDLE_PATH dead config on AWS-day while
 * still looking correct in review — the exact failure adr/2026-08-01-03 forbids.
 *
 * Providers hand out URLs containing `sslmode=require`, and psql needs it, so DATABASE_URL keeps
 * it and this strips it on the way into the pool. TLS is then decided in exactly one place.
 *
 * Deliberately dependency-free so it stays cheap to test.
 */
export function stripSslParams(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    for (const p of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) url.searchParams.delete(p);
    return url.toString();
  } catch {
    // Not a URL (libpq key=value form). Leave it alone rather than mangling it.
    return connectionString;
  }
}
