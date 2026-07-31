# Database

Postgres, via Supabase. Stores *selections* only — army lists and (later)
engagements. Rules data stays in `app/codex` as JSON imported at build time, so
reading a datasheet never touches the database or the network.

## Local setup

```bash
# once
cp .env.local.example .env.local

# each session — needs Docker Desktop running
npx supabase start          # prints the DB URL, anon key, Studio URL
npm run db:migrate          # applies data/db/migrations
```

`npx supabase stop` when finished; `npx supabase db reset` for a clean slate.

## Migrations

Schema lives in `app/db/schema.ts`. After changing it:

```bash
npm run db:generate         # writes SQL into data/db/migrations
npm run db:migrate          # applies it to whatever DATABASE_URL points at
```

Migrations are checked in, and the same files are replayed by the test harness —
so the schema tests exercise is the schema production gets.

## Testing

Repository tests do **not** need Docker or a running database. `app/db/testDb.ts`
spins up [PGlite](https://pglite.dev) — Postgres compiled to WASM — in-process and
runs the checked-in migrations against it. Each `createTestDb()` call gets its own
isolated database, so tests cannot leak rows into one another.

Budget it at roughly half a second per database. That is why only the repository
layer uses it: validation, points and profile resolution are pure functions over
plain data and are tested without any of this.

```ts
const { db, close } = await createTestDb();
try {
    /* ... */
} finally {
    await close();
}
```
