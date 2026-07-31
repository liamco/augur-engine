import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The application's database connection.
 *
 * Server-only — route handlers and anything they call. Importing this from client
 * code would leak the connection string into the bundle.
 *
 * `DATABASE_URL` comes from `.env.local` in development (the local Supabase
 * instance printed by `supabase start`) and from Vercel's environment variables
 * in production. Tests never come through here: they use `createTestDb`, which
 * runs the same migrations against PGlite in-process.
 *
 * The connection is created lazily and cached, so importing this module in an
 * environment with no database configured is harmless until something queries.
 */
let cached: ReturnType<typeof create> | null = null;

function create() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error(
            "DATABASE_URL is not set. Run `supabase start` and copy the connection " +
                "string into .env.local, or set it in the Vercel project.",
        );
    }

    // One connection per server instance. `prepare: false` is required when
    // talking to Supabase through its connection pooler.
    const client = postgres(url, { prepare: false });
    return drizzle(client, { schema });
}

export function getDb() {
    cached ??= create();
    return cached;
}
