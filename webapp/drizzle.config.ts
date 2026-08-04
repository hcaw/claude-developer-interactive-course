// Migrations are generated and applied from a DEV MACHINE, never inside the Vercel build
// (adr/2026-08-01-03). Run:
//   npx drizzle-kit generate     # write SQL into drizzle/
//   npx drizzle-kit migrate      # apply it
//
// Works unchanged against Neon today and RDS on AWS-day — it only reads DATABASE_URL.

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Match what Next.js itself loads, so `drizzle-kit` never disagrees with the running app about
// where DATABASE_URL lives. .env.local wins, as it does in Next.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["course_app"],

  // Keep the migration journal inside course_app. By default drizzle-kit puts it in its own
  // `drizzle` schema, which the app role cannot create — it has no CREATE on the database, by
  // design (adr/2026-08-01-03). Relocating it needs no extra privilege and keeps everything the
  // app owns in one schema.
  migrations: { schema: "course_app", table: "__drizzle_migrations" },
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.DB_CA_BUNDLE_PATH
      ? { rejectUnauthorized: true, ca: process.env.DB_CA_BUNDLE_PATH }
      : { rejectUnauthorized: true },
  },
  verbose: true,
  strict: true,
});
