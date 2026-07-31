import type { Config } from "drizzle-kit";

/**
 * Migration generation and application.
 *
 *   npm run db:generate   writes SQL into data/db/migrations (no connection needed)
 *   npm run db:migrate    applies it to whatever DATABASE_URL points at
 *
 * Migrations are checked in and replayed by both the local database and the PGlite
 * instance the repository tests use, so the schema tests exercise is the schema
 * production gets.
 *
 * `.env.local` is loaded explicitly. Next.js loads it automatically but drizzle-kit
 * is a standalone CLI and sees only the shell environment, so without this
 * `DATABASE_URL` arrives empty and the driver fails with `url: ''`.
 */
try {
    process.loadEnvFile(".env.local");
} catch {
    // Absent in CI and on a fresh clone. `db:generate` does not need it, and
    // `db:migrate` fails below with a message that says what to do.
}

const url = process.env.DATABASE_URL;

export default {
    schema: "./app/db/schema.ts",
    out: "./data/db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: url ?? "",
    },
} satisfies Config;
