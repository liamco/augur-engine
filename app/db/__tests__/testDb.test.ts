import { describe, it, expect } from "vitest";
import { createTestDb } from "../testDb";
import { lists } from "../schema";

/**
 * Proves the test harness itself: a real Postgres, in-process, with the same
 * checked-in migrations production runs. If this works, repository tests need no
 * Docker and will work unchanged in CI.
 */
describe("createTestDb", () => {
    it("applies the checked-in migrations", async () => {
        const { db, close } = await createTestDb();
        try {
            // Selecting from the table proves the migration ran; an unmigrated
            // database would throw "relation does not exist".
            expect(await db.select().from(lists)).toEqual([]);
        } finally {
            await close();
        }
    });

    it("round-trips a list, including the JSONB selections tree", async () => {
        const { db, close } = await createTestDb();
        try {
            const [inserted] = await db
                .insert(lists)
                .values({
                    name: "Test list",
                    factionSlug: "space-marines",
                    listSize: "strike-force",
                    dataVersion: "2026-05-09 23:42:21",
                    selections: {
                        detachments: ["gladius-task-force"],
                        units: [
                            {
                                instanceId: "u1",
                                datasheetId: "000000079",
                                loadout: ["000000079:force-weapon"],
                                modelCount: 1,
                            },
                        ],
                    },
                })
                .returning();

            expect(inserted.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(inserted.selections.detachments).toEqual(["gladius-task-force"]);
            expect(inserted.selections.units[0].datasheetId).toBe("000000079");
            expect(inserted.createdAt).toBeInstanceOf(Date);
        } finally {
            await close();
        }
    });

    it("gives each call an isolated database", async () => {
        // Otherwise one test's rows leak into the next and ordering matters.
        const a = await createTestDb();
        const b = await createTestDb();
        try {
            await a.db.insert(lists).values({
                name: "only in a",
                factionSlug: "necrons",
                listSize: "incursion",
                dataVersion: "v1",
                selections: { detachments: [], units: [] },
            });

            expect(await a.db.select().from(lists)).toHaveLength(1);
            expect(await b.db.select().from(lists)).toHaveLength(0);
        } finally {
            await a.close();
            await b.close();
        }
    });

    it("enforces NOT NULL, so a malformed insert fails loudly", async () => {
        const { db, close } = await createTestDb();
        try {
            await expect(
                db.insert(lists).values({
                    name: "no faction",
                    listSize: "incursion",
                    dataVersion: "v1",
                    selections: { detachments: [], units: [] },
                } as never),
            ).rejects.toThrow();
        } finally {
            await close();
        }
    });
});
