import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { ListSelections } from "@/app/types/List";

/**
 * Army lists.
 *
 * `selections` is JSONB rather than child tables on purpose: it is a tree the
 * editor always reads and writes whole, and its only foreign keys point at codex
 * *files* (datasheet, wargear and detachment ids) rather than tables — so the
 * database could not enforce referential integrity over them however it was
 * modelled. Normalising would buy migrations and joins for no integrity gain.
 *
 * What *is* normalised is everything queried or filtered independently: who owns
 * a list, which faction and battle size it is, and when it changed.
 *
 * `dataVersion` records the codex snapshot the selections were made against,
 * taken from the faction's `faction.json`. `npm run parse` regenerates the codex
 * wholesale and ids do disappear, so references are re-resolved on load and a
 * stale list reports repairable problems rather than throwing.
 */
export const lists = pgTable("lists", {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Nullable until auth lands, so phase 5 needs no migration. */
    ownerId: uuid("owner_id"),
    name: text("name").notNull(),
    factionSlug: text("faction_slug").notNull(),
    /** A `name` from app/library/bootstrap/list-sizes.json. */
    listSize: text("list_size").notNull(),
    dataVersion: text("data_version").notNull(),
    selections: jsonb("selections").$type<ListSelections>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .default(sql`now()`),
});

export type ListRow = typeof lists.$inferSelect;
export type NewListRow = typeof lists.$inferInsert;
