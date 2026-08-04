// Grant admin rights to someone, from the command line.
//
//   npm run admin:grant -- ahmed.ezzat@stackdrop.co
//   DATABASE_URL=... npm run admin:grant -- someone@stackdrop.co
//
// This is the bootstrap (the first admin, before anyone can reach /admin) and the break-glass (if
// the last admin is ever removed despite the guard in src/app/admin/actions.ts). There is no env
// override for admin rights — that was the old BOOTSTRAP_ADMIN_EMAILS, removed in
// adr/2026-08-04-10 because changing it on Vercel needed a redeploy and left no audit trail.
//
// It writes exactly what the /admin UI writes: users.is_admin, plus an access_events row. The
// actor is NULL, which the schema already defines as "system".
//
// It UPDATEs an existing row and never INSERTs one. Pre-creating a users row for someone who has
// not signed in yet breaks their first Google sign-in: the Auth.js adapter finds a user with that
// email but no linked `accounts` row and fails with OAuthAccountNotLinked. So the order is: they
// sign in once (auto-provisioned as a member), then you run this.
//
// Env and TLS handling mirror scripts/migrate.mjs — keep the two in step.

import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run admin:grant -- <email>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Fill in webapp/.env (see .env.example).");
  process.exit(1);
}

const caPath = process.env.DB_CA_BUNDLE_PATH;
const ca = caPath ? readFileSync(caPath, "utf8") : undefined;

// node-postgres lets the URL's sslmode silently override the ssl option, which would make the CA
// bundle dead config. Same stripping as src/db/index.ts and scripts/migrate.mjs.
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

const client = await pool.connect();
try {
  const { rows } = await client.query(
    "SELECT id, email, is_admin, revoked_at FROM course_app.users WHERE email = $1",
    [email]
  );
  const user = rows[0];

  if (!user) {
    console.error(`No user with email ${email}.`);
    console.error(
      "They have to sign in with Google once first — that is what creates the row. Then re-run this."
    );
    process.exitCode = 1;
  } else if (user.revoked_at) {
    // Granting admin to a revoked user would be a no-op they can't use: they can't hold a session
    // at all. Restore first, in /admin, so the restore is audited as its own event.
    console.error(`${email} is revoked and could not sign in even as an admin.`);
    console.error("Restore their access in /admin first, then re-run this.");
    process.exitCode = 1;
  } else if (user.is_admin) {
    console.log(`${email} is already an admin. Nothing to do.`);
  } else {
    // One transaction: the flag and its audit event are never allowed to disagree.
    await client.query("BEGIN");
    await client.query("UPDATE course_app.users SET is_admin = true WHERE id = $1", [user.id]);
    await client.query(
      "INSERT INTO course_app.access_events (user_id, action, actor_id) VALUES ($1, 'granted_admin', NULL)",
      [user.id]
    );
    await client.query("COMMIT");
    console.log(`${email} is now an admin (recorded in access_events, actor: system).`);
  }
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("\nGrant FAILED:");
  console.error(`  ${err.message}`);
  for (const k of ["code", "severity", "detail", "hint", "schema", "table", "constraint"]) {
    if (err[k]) console.error(`  ${k}: ${err[k]}`);
  }
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
