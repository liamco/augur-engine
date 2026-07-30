import { describe, it, expect } from "vitest";
import {
    transformDetachments,
    extractCoreStratagems,
} from "../transformDetachments";
import type { RawFactionDetachment, RawStratagem } from "../../types";

describe("transformDetachments", () => {
    const rawDetachment: RawFactionDetachment = {
        slug: "assimilation-swarm",
        name: "Assimilation Swarm",
        abilities: [
            {
                id: "000008411",
                factionId: "TYR",
                name: "Feed the Swarm",
                legend: "Even as the beasts...",
                description: "<b>In your Command phase</b>...",
                detachment: "Assimilation Swarm",
                detachmentId: "000000771",
            },
        ],
        enhancements: [
            {
                factionId: "TYR",
                id: "000008412002",
                name: "Regenerating Monstrosity",
                cost: "20",
                detachment: "Assimilation Swarm",
                detachmentId: "000000771",
                legend: "This nightmarish creature...",
                description: "<span>TYRANIDS</span> model only...",
            },
        ],
        stratagems: [
            {
                factionId: "TYR",
                name: "RAPACIOUS HUNGER",
                id: "000008413007",
                type: "Assimilation Swarm – Battle Tactic Stratagem",
                cpCost: "1",
                legend: "The hunger of the Tyranids...",
                turn: "Your turn",
                phase: "Fight phase",
                detachment: "Assimilation Swarm",
                detachmentId: "000000771",
                description: "<b>WHEN:</b> Your Fight phase...",
            },
        ],
    };

    it("transforms detachment with abilities, stratagems, and enhancements", () => {
        const result = transformDetachments([rawDetachment]);
        expect(result).toHaveLength(1);

        const det = result[0];
        expect(det.name).toBe("Assimilation Swarm");
        expect(det.abilities).toHaveLength(1);
        expect(det.abilities[0].id).toBe("000008411");
        expect(det.abilities[0].name).toBe("Feed the Swarm");
    });

    it("keeps every ability, not just the first", () => {
        const multiAbility: RawFactionDetachment = {
            ...rawDetachment,
            name: "Hammer of Avernii",
            abilities: [
                { ...rawDetachment.abilities[0], id: "1", name: "Calculated Annihilation" },
                { ...rawDetachment.abilities[0], id: "2", name: "Recalculating" },
                { ...rawDetachment.abilities[0], id: "3", name: "Restrictions" },
            ],
        };

        const result = transformDetachments([multiAbility]);

        expect(result[0].abilities.map((a) => a.name)).toEqual([
            "Calculated Annihilation",
            "Recalculating",
            "Restrictions",
        ]);
    });

    it("survives a detachment with no abilities", () => {
        const noAbilities: RawFactionDetachment = {
            ...rawDetachment,
            abilities: [],
        };

        expect(() => transformDetachments([noAbilities])).not.toThrow();
        expect(transformDetachments([noAbilities])[0].abilities).toEqual([]);
    });

    it("parses stratagem cpCost to number", () => {
        const result = transformDetachments([rawDetachment]);
        expect(result[0].stratagems[0].cpCost).toBe(1);
    });

    it("strips detachment prefix from stratagem type", () => {
        const result = transformDetachments([rawDetachment]);
        expect(result[0].stratagems[0].type).toBe("Battle Tactic");
    });

    it("parses enhancement cost to number", () => {
        const result = transformDetachments([rawDetachment]);
        expect(result[0].enhancements[0].cost).toBe(20);
    });

    it("removes factionId and detachment fields from entries", () => {
        const result = transformDetachments([rawDetachment]);
        const strat = result[0].stratagems[0] as unknown as Record<string, unknown>;
        expect(strat).not.toHaveProperty("factionId");
        expect(strat).not.toHaveProperty("detachment");
        expect(strat).not.toHaveProperty("detachmentId");
    });
});

describe("extractCoreStratagems", () => {
    const boardingActions: RawStratagem = {
        factionId: "",
        name: "COMMAND RE-ROLL",
        id: "000009218002",
        type: "Boarding Actions – Epic Deed Stratagem",
        cpCost: "1",
        legend: "A great commander...",
        turn: "Either player's turn",
        phase: "Any phase",
        detachment: "",
        detachmentId: "",
        description: "<b>WHEN:</b> Any phase...",
    };

    const core: RawStratagem = {
        ...boardingActions,
        id: "000008335002",
        type: "Core – Battle Tactic Stratagem",
    };

    const detachmentStratagem: RawStratagem = {
        factionId: "TYR",
        name: "INVISIBLE HUNTER",
        id: "000008418007",
        type: "Vanguard Onslaught – Strategic Ploy Stratagem",
        cpCost: "1",
        legend: "...",
        turn: "Opponent's turn",
        phase: "Fight phase",
        detachment: "Vanguard Onslaught",
        detachmentId: "000000772",
        description: "...",
    };

    it("extracts stratagems whose type is Core", () => {
        const result = extractCoreStratagems([core, detachmentStratagem]);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("COMMAND RE-ROLL");
        expect(result[0].cpCost).toBe(1);
        expect(result[0].type).toBe("Battle Tactic");
    });

    it("excludes Boarding Actions stratagems, which also have no faction or detachment", () => {
        expect(extractCoreStratagems([boardingActions])).toEqual([]);
    });

    it("keeps the Core rule when a Boarding Actions rule shares its name", () => {
        const result = extractCoreStratagems([boardingActions, core]);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("000008335002");
    });

    it("returns empty array when no core stratagems exist", () => {
        const stratagems: RawStratagem[] = [
            {
                factionId: "TYR",
                name: "TEST",
                id: "1",
                type: "Test – Battle Tactic Stratagem",
                cpCost: "1",
                legend: "",
                turn: "",
                phase: "",
                detachment: "Test",
                detachmentId: "123",
                description: "",
            },
        ];

        expect(extractCoreStratagems(stratagems)).toEqual([]);
    });
});
