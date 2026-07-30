import { describe, it, expect } from "vitest";
import { buildDetachmentIndex } from "../detachmentIndex";
import type { ParsedDetachment } from "../../types";

const faction = (slug: string, name: string) => ({ id: slug.toUpperCase(), slug, name });

const detachment = (over: Partial<ParsedDetachment> = {}): ParsedDetachment => ({
    id: "000000750",
    slug: "gladius-task-force",
    name: "Gladius Task Force",
    abilities: [
        {
            id: "000008355",
            name: "Combat Doctrines",
            description: "At the start of your Command phase…",
            legend: "",
        },
    ],
    stratagems: [
        {
            id: "000008354001",
            name: "Armour of Contempt",
            type: "Battle Tactic",
            cpCost: 1,
            legend: "",
            turn: "either",
            phase: "any",
            description: "…",
        },
    ],
    enhancements: [
        {
            id: "000008353002",
            name: "Artificer Armour",
            cost: 10,
            legend: "Crafted by the Chapter's finest artificers.",
            description: "The bearer has a Save characteristic of 2+.",
        },
    ],
    ...over,
});

describe("buildDetachmentIndex", () => {
    it("carries identity, faction and config fields onto each entry", () => {
        const index = buildDetachmentIndex([
            {
                faction: faction("space-marines", "Space Marines"),
                detachments: [
                    detachment({
                        supplement: "codex",
                        detachmentPoints: 3,
                        disposition: "priority-assets",
                    }),
                ],
            },
        ]);

        expect(index).toHaveLength(1);
        expect(index[0]).toMatchObject({
            id: "000000750",
            slug: "gladius-task-force",
            name: "Gladius Task Force",
            faction: { id: "SPACE-MARINES", slug: "space-marines", name: "Space Marines" },
            supplement: "codex",
            detachmentPoints: 3,
            disposition: "priority-assets",
        });
    });

    it("keeps abilities and enhancements, which the engine and lab both read", () => {
        const [entry] = buildDetachmentIndex([
            {
                faction: faction("space-marines", "Space Marines"),
                detachments: [detachment()],
            },
        ]);

        expect(entry.abilities.map((a) => a.name)).toEqual(["Combat Doctrines"]);
        expect(entry.enhancements).toEqual([
            {
                id: "000008353002",
                name: "Artificer Armour",
                cost: 10,
                legend: "Crafted by the Chapter's finest artificers.",
                description: "The bearer has a Save characteristic of 2+.",
            },
        ]);
    });

    it("omits stratagems, which stay in the per-detachment files", () => {
        const [entry] = buildDetachmentIndex([
            {
                faction: faction("space-marines", "Space Marines"),
                detachments: [detachment()],
            },
        ]);

        expect(entry).not.toHaveProperty("stratagems");
    });

    it("omits eligibility lists at every level — they are 70% of the bytes", () => {
        const [entry] = buildDetachmentIndex([
            {
                faction: faction("space-marines", "Space Marines"),
                detachments: [
                    detachment({
                        eligibleDatasheets: { exclude: ["000000060"] },
                        abilities: [
                            {
                                id: "a1",
                                name: "Combat Doctrines",
                                description: "…",
                                legend: "",
                                eligibleDatasheets: "all",
                            },
                        ],
                        enhancements: [
                            {
                                id: "e1",
                                name: "Artificer Armour",
                                cost: 10,
                                legend: "",
                                description: "…",
                                eligibleDatasheets: { include: ["000000060"] },
                            },
                        ],
                    }),
                ],
            },
        ]);

        expect(entry).not.toHaveProperty("eligibleDatasheets");
        expect(entry.abilities[0]).not.toHaveProperty("eligibleDatasheets");
        expect(entry.enhancements[0]).not.toHaveProperty("eligibleDatasheets");
    });

    it("sorts by faction name then detachment name, so the lab's list is stable", () => {
        const index = buildDetachmentIndex([
            {
                faction: faction("tyranids", "Tyranids"),
                detachments: [
                    detachment({ slug: "vanguard-onslaught", name: "Vanguard Onslaught" }),
                    detachment({ slug: "assimilation-swarm", name: "Assimilation Swarm" }),
                ],
            },
            {
                faction: faction("necrons", "Necrons"),
                detachments: [detachment({ slug: "awakened-dynasty", name: "Awakened Dynasty" })],
            },
        ]);

        expect(index.map((d) => `${d.faction.slug}/${d.slug}`)).toEqual([
            "necrons/awakened-dynasty",
            "tyranids/assimilation-swarm",
            "tyranids/vanguard-onslaught",
        ]);
    });

    it("leaves absent config fields absent rather than emitting nulls", () => {
        const [entry] = buildDetachmentIndex([
            {
                faction: faction("necrons", "Necrons"),
                detachments: [detachment()],
            },
        ]);

        expect(entry).not.toHaveProperty("supplement");
        expect(entry).not.toHaveProperty("detachmentPoints");
        expect(entry).not.toHaveProperty("disposition");
    });
});
