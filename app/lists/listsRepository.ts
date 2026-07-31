import { desc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/app/db/schema";
import { lists, type ListRow, type NewListRow } from "@/app/db/schema";

/**
 * Persistence for army lists — a thin edge over Drizzle.
 *
 * Deliberately thin: it stores and fetches, and knows nothing about budgets,
 * points or codex ids. All of that lives in the pure modules beside it
 * (`validateDetachments`, and profile resolution to come), which take plain data
 * and need no database. Keeping the split means the rules logic stays fast to
 * test and this layer stays trivial enough to trust.
 *
 * The `db` handle is passed in rather than imported so tests can hand it a PGlite
 * instance while route handlers pass the real connection from `getDb()`.
 */

/**
 * Anything Drizzle can run Postgres queries against.
 *
 * `PgDatabase` is the base both drivers extend, so this accepts the postgres-js
 * client the app uses and the PGlite instance the tests use without either
 * leaking into this module.
 */
type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type CreateListInput = Omit<
    NewListRow,
    "id" | "createdAt" | "updatedAt"
> & {
    createdAt?: Date;
};

export async function createList(
    db: Db,
    input: CreateListInput,
): Promise<ListRow> {
    const [row] = await db.insert(lists).values(input).returning();
    return row;
}

export async function getList(db: Db, id: string): Promise<ListRow | null> {
    const [row] = await db.select().from(lists).where(eq(lists.id, id)).limit(1);
    return row ?? null;
}

export interface ListListsOptions {
    /** Restrict to one owner. Omitted means every list, the pre-auth behaviour. */
    ownerId?: string;
}

export async function listLists(
    db: Db,
    { ownerId }: ListListsOptions = {},
): Promise<ListRow[]> {
    const base = db.select().from(lists);
    const scoped = ownerId ? base.where(eq(lists.ownerId, ownerId)) : base;
    // Newest first: the editor's index should open on recent work.
    return scoped.orderBy(desc(lists.createdAt));
}

export type UpdateListInput = Partial<
    Pick<ListRow, "name" | "factionSlug" | "listSize" | "dataVersion" | "selections">
>;

export async function updateList(
    db: Db,
    id: string,
    patch: UpdateListInput,
): Promise<ListRow | null> {
    const [row] = await db
        .update(lists)
        // Touched on every write so the index can order by recency of change.
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(lists.id, id))
        .returning();
    return row ?? null;
}

/** True when a row was removed, false when there was nothing to remove. */
export async function deleteList(db: Db, id: string): Promise<boolean> {
    const removed = await db.delete(lists).where(eq(lists.id, id)).returning();
    return removed.length > 0;
}
