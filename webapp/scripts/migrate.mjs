// Apply pending migrations and report failures properly.
//
// `drizzle-kit migrate` renders a spinner that swallows the driver error and just exits 1, which
// makes a permissions problem look identical to a syntax problem. This runs the same migrator
// directly so the real Postgres error reaches you.
//
//   node scripts/migrate.mjs
//   DATABASE_URL=... node scripts/migrate.mjs     # override .env (e.g. to migrate as the owner)
//
// Uses the DIRECT (non-pooled) Neon host by preference — DDL through a transaction pooler is asking
// for trouble. Migrations run from a dev machine, never in the Vercel build (adr/2026-08-01-03).

import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Fill in webapp/.env (see .env.example).");
  process.exit(1);
}

const caPath = process.env.DB_CA_BUNDLE_PATH;
const ca = caPath ? readFileSync(caPath, "utf8") : undefined;

const url = new URL(connectionString);
if (url.hostname.includes("-pooler")) {
  console.warn(
    `! ${url.hostname} is a pooled endpoint. Prefer the direct host for migrations; the pooled one is for the app.`
  );
}
console.log(`Migrating ${url.pathname.slice(1)} as ${url.username} @ ${url.hostname}`);

// Mirrors stripSslParams() in src/db/index.ts — node-postgres lets the URL's sslmode silently
// override the ssl option, which would make the CA bundle dead config. Keep the two in step.
const cleaned = (() => {
  try {
    const u = new URL(connectionString);
    for (const p of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) u.searchParams.delete(p);
    return u.toString();
  } catch {
    return connectionString;
  }
})();

const pool = new Pool({
  connectionString: cleaned,
  max: 1,
  ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
});

try {
  await migrate(drizzle(pool), {
    migrationsFolder: "./drizzle",
    migrationsSchema: "course_app",
    migrationsTable: "__drizzle_migrations",
  });
  console.log("Migrations applied.");
} catch (err) {
  console.error("\nMigration FAILED:");
  console.error(`  ${err.message}`);
  // The useful detail (constraint, permission, position) hangs off `cause` on driver errors.
  if (err.cause) {
    const c = err.cause;
    console.error(`  cause: ${c.message ?? c}`);
    for (const k of ["code", "severity", "detail", "hint", "schema", "table", "constraint"]) {
      if (c[k]) console.error(`  ${k}: ${c[k]}`);
    }
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
