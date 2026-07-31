import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

const MIGRATIONS = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../data/db/migrations",
);

/**
 * A throwaway Postgres for a single test, running in this process.
 *
 * PGlite is Postgres compiled to WASM, so this is a real Postgres — JSONB,
 * `gen_random_uuid()`, NOT NULL and all — rather than a mock or SQLite standing
 * in. It needs no Docker, which keeps `npm test` self-contained and means these
 * tests will work unchanged in CI.
 *
 * The migrations applied are the checked-in ones production runs, so the schema
 * under test is the schema that ships. `in-memory` gives each call its own
 * database, so tests cannot leak rows into one another or depend on ordering.
 *
 * Test-only: nothing outside `__tests__` should import this.
 */
export async function createTestDb() {
    const client = new PGlite();
    const db = drizzle(client, { schema });

    await migrate(db, { migrationsFolder: MIGRATIONS });

    return {
        db,
        close: () => client.close(),
    };
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];
