// Postgres connection for the app.
//
// PORTABILITY SEAM. This file is the only place that knows anything about the database provider,
// and it is written so that moving from Neon (free tier, today) to RDS (AWS-day) is an env change:
//
//   DATABASE_URL         Neon pooled endpoint  ->  RDS endpoint
//   DB_CA_BUNDLE_PATH    unset                 ->  ./certs/rds-global-bundle.pem
//
// TLS is verified in BOTH cases. Neon's certificate chains to a publicly trusted CA, so Node's
// default trust store validates it; RDS needs Amazon's bundle. `rejectUnauthorized: false` is
// forbidden either way (adr/2026-08-01-03).
//
// Pooling: Vercel functions are short-lived and each holds its own pool, so `max: 1` keeps the
// server-side connection count proportional to concurrent invocations rather than to instances.
// The pool is memoized on globalThis so dev hot-reload doesn't leak a new pool per edit.

import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { stripSslParams } from "./ssl";

function createPool(): Pool {
  const raw = process.env.DATABASE_URL;
  const connectionString = raw ? stripSslParams(raw) : raw;
  const caPath = process.env.DB_CA_BUNDLE_PATH;
  const ca = caPath ? readFileSync(caPath, "utf8") : undefined;

  const pool = new Pool({
    connectionString,
    max: 1,
    // Always verified. With sslmode stripped above, this is the only thing deciding TLS.
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  });

  // Neither `new Pool()` nor `drizzle()` opens a socket, so building them at import is free — and
  // it has to happen at import, because the Auth.js Drizzle adapter inspects the instance's
  // prototype to detect the SQL flavor and cannot be handed a lazy wrapper.
  //
  // What must NOT happen at import is failing on a missing DATABASE_URL: `next build` loads every
  // route module to collect page data, and on Vercel the variable is bound at runtime. So defer
  // that complaint to the first actual query, where it is also far easier to interpret.
  if (!connectionString) {
    const fail = () => {
      throw new Error(
        "DATABASE_URL is not set. Copy webapp/.env.example to webapp/.env.local and fill it in."
      );
    };
    pool.connect = fail as never;
    pool.query = fail as never;
  }

  return pool;
}

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __coursePool?: Pool; __courseDb?: Db };

const pool = globalForDb.__coursePool ?? createPool();
const instance = globalForDb.__courseDb ?? drizzle(pool, { schema });

// Memoized so dev hot-reload reuses one pool instead of leaking a new one per edit.
if (process.env.NODE_ENV !== "production") {
  globalForDb.__coursePool = pool;
  globalForDb.__courseDb = instance;
}

export const db = instance;
export { schema };
