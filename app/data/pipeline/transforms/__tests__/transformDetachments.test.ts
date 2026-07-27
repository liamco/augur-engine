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

    it("transforms detachment with ability, stratagems, and enhancements", () => {
        const result = transformDetachments([rawDetachment]);
        expect(result).toHaveLength(1);

        const det = result[0];
        expect(det.name).toBe("Assimilation Swarm");
        expect(det.ability.id).toBe("000008411");
        expect(det.ability.name).toBe("Feed the Swarm");
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
    it("extracts stratagems with empty factionId and detachmentId", () => {
        const stratagems: RawStratagem[] = [
            {
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
            },
            {
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
            },
        ];

        const result = extractCoreStratagems(stratagems);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("COMMAND RE-ROLL");
        expect(result[0].cpCost).toBe(1);
        expect(result[0].type).toBe("Epic Deed");
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
