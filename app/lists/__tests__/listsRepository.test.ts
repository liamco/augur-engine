import { describe, it, expect } from "vitest";
import { createTestDb, type TestDb } from "@/app/db/testDb";
import { createList, deleteList, getList, listLists, updateList } from "../listsRepository";
import type { ListSelections } from "@/app/types/List";

const emptySelections: ListSelections = { detachments: [], units: [] };

const seed = (db: TestDb, name: string, over: Record<string, unknown> = {}) =>
    createList(db, {
        name,
        factionSlug: "space-marines",
        listSize: "strike-force",
        dataVersion: "2026-05-09 23:42:21",
        selections: emptySelections,
        ...over,
    });

const withDb = async (run: (db: TestDb) => Promise<void>) => {
    const { db, close } = await createTestDb();
    try {
        await run(db);
    } finally {
        await close();
    }
};

describe("listsRepository", () => {
    it("creates a list and gives it an id and timestamps", async () => {
        await withDb(async (db) => {
            const created = await seed(db, "Gladius test");
            expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(created.name).toBe("Gladius test");
            expect(created.createdAt).toBeInstanceOf(Date);
        });
    });

    it("reads a list back by id", async () => {
        await withDb(async (db) => {
            const created = await seed(db, "Readable");
            const found = await getList(db, created.id);
            expect(found?.name).toBe("Readable");
        });
    });

    it("returns null for an id that does not exist", async () => {
        await withDb(async (db) => {
            expect(
                await getList(db, "00000000-0000-0000-0000-000000000000"),
            ).toBeNull();
        });
    });

    it("lists newest first, so the editor shows recent work at the top", async () => {
        await withDb(async (db) => {
            await seed(db, "older", { createdAt: new Date("2026-01-01") });
            await seed(db, "newer", { createdAt: new Date("2026-06-01") });
            expect((await listLists(db)).map((l) => l.name)).toEqual([
                "newer",
                "older",
            ]);
        });
    });

    it("updates selections and moves updatedAt", async () => {
        await withDb(async (db) => {
            const created = await seed(db, "To update");
            const updated = await updateList(db, created.id, {
                selections: {
                    detachments: ["gladius-task-force"],
                    units: [],
                },
            });

            expect(updated?.selections.detachments).toEqual(["gladius-task-force"]);
            expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
                created.updatedAt.getTime(),
            );
        });
    });

    it("returns null when updating something that is not there", async () => {
        await withDb(async (db) => {
            expect(
                await updateList(db, "00000000-0000-0000-0000-000000000000", {
                    name: "ghost",
                }),
            ).toBeNull();
        });
    });

    it("deletes a list and reports whether it did", async () => {
        await withDb(async (db) => {
            const created = await seed(db, "Doomed");
            expect(await deleteList(db, created.id)).toBe(true);
            expect(await getList(db, created.id)).toBeNull();
            expect(await deleteList(db, created.id)).toBe(false);
        });
    });

    it("filters by owner once auth populates it, and ignores unowned rows", async () => {
        await withDb(async (db) => {
            const owner = "11111111-1111-1111-1111-111111111111";
            await seed(db, "mine", { ownerId: owner });
            await seed(db, "someone else's", {
                ownerId: "22222222-2222-2222-2222-222222222222",
            });
            await seed(db, "unowned");

            expect((await listLists(db, { ownerId: owner })).map((l) => l.name)).toEqual(
                ["mine"],
            );
            // No filter means everything, which is the pre-auth behaviour.
            expect(await listLists(db)).toHaveLength(3);
        });
    });

    it("stores a full selections tree without flattening it", async () => {
        await withDb(async (db) => {
            const created = await seed(db, "Full", {
                selections: {
                    detachments: ["gladius-task-force", "anvil-siege-force"],
                    units: [
                        {
                            instanceId: "u1",
                            datasheetId: "000000079",
                            enhancementId: "000008353002",
                            loadout: ["000000079:force-weapon"],
                            modelCount: 1,
                        },
                        {
                            instanceId: "u2",
                            datasheetId: "000000126",
                            attachedTo: "u1",
                            loadout: [],
                            modelCount: 5,
                        },
                    ],
                },
            });

            const found = await getList(db, created.id);
            expect(found?.selections.units).toHaveLength(2);
            expect(found?.selections.units[1].attachedTo).toBe("u1");
            expect(found?.selections.units[0].enhancementId).toBe("000008353002");
        });
    });
});
