import { describe, it, expect } from "vitest";
import { restructureTopLevel } from "../restructureTopLevel";
import type { RawDatasheet } from "../../types";

function makeRaw(overrides: Partial<RawDatasheet> = {}): RawDatasheet {
    return {
        id: "000002694",
        name: "Winged Tyranid Prime",
        factionId: "TYR",
        sourceId: "000000020",
        legend: "",
        role: "Characters",
        loadout: "",
        transport: "",
        virtual: false,
        leaderHead: "",
        leaderFooter: "",
        damagedW: "",
        damagedDescription: "",
        link: "",
        slug: "winged-tyranid-prime-2",
        factionSlug: "tyranids",
        supplementKey: "codex",
        abilities: [],
        keywords: [],
        models: [],
        options: [],
        wargear: [],
        unitComposition: [],
        modelCosts: [],
        stratagems: [],
        enhancements: [],
        detachmentAbilities: [],
        leaders: [],
        supplementLabel: "None",
        isSupplement: false,
        roleLabel: "Characters",
        sourceName: "Faction Pack: Tyranids",
        isForgeWorld: false,
        isLegends: false,
        ...overrides,
    };
}

describe("restructureTopLevel", () => {
    it("creates faction object from flat fields", () => {
        const result = restructureTopLevel(makeRaw());
        expect(result.faction).toEqual({ id: "TYR", slug: "tyranids" });
    });

    it("creates source object from flat fields", () => {
        const result = restructureTopLevel(makeRaw());
        expect(result.source).toEqual({
            id: "000000020",
            name: "Faction Pack: Tyranids",
        });
    });

    it("creates supplement object, defaulting slug and name when the source omits them", () => {
        const result = restructureTopLevel(makeRaw());
        expect(result.supplement).toEqual({
            key: "codex",
            slug: "",
            name: "",
            label: "None",
            isSupplement: false,
        });
    });

    it("carries supplement slug and name through when the source has them", () => {
        const result = restructureTopLevel(
            makeRaw({
                supplementKey: "space-wolves",
                supplementSlug: "space-wolves",
                supplementName: "Space Wolves (Legends)",
                supplementLabel: "Space Wolves (Legends)",
                isSupplement: true,
            }),
        );

        expect(result.supplement).toEqual({
            key: "space-wolves",
            slug: "space-wolves",
            name: "Space Wolves (Legends)",
            label: "Space Wolves (Legends)",
            isSupplement: true,
        });
    });

    it("creates leader from leaders array", () => {
        const result = restructureTopLevel(
            makeRaw({
                leaders: [
                    { id: "000002692", slug: "tyranid-warriors-with-ranged-bio-weapons" },
                    { id: "000000484", slug: "gargoyles-2" },
                ],
            }),
        );
        expect(result.leader).toEqual({
            canLead: [
                { id: "000002692", slug: "tyranid-warriors-with-ranged-bio-weapons" },
                { id: "000000484", slug: "gargoyles-2" },
            ],
            leaderNotes: "",
        });
    });

    it("returns null leader when leaders array is empty", () => {
        const result = restructureTopLevel(makeRaw({ leaders: [] }));
        expect(result.leader).toBeNull();
    });

    it("joins leaderHead and leaderFooter", () => {
        const result = restructureTopLevel(
            makeRaw({
                leaders: [{ id: "1", slug: "test" }],
                leaderHead: "Head note",
                leaderFooter: "Foot note",
            }),
        );
        expect(result.leader?.leaderNotes).toBe("Head note\nFoot note");
    });
});
