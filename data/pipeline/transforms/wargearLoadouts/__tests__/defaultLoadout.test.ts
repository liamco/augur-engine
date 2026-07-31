import { describe, it, expect } from "vitest";
import { parseDefaultLoadout, buildDefaultLoadout } from "../defaultLoadout";
import type { NameLookup } from "../resolveNames";

const REDEMPTOR_RAW =
    "<b>This model is equipped with:</b> Twin fragstorm grenade launcher; heavy flamer; heavy onslaught gatling cannon; Redemptor fist.";

const redemptorLookup: NameLookup = {
    datasheetId: "000002717",
    weapons: [
        { id: "000002717:twin-fragstorm-grenade-launcher", name: "Twin fragstorm grenade launcher" },
        { id: "000002717:heavy-flamer", name: "Heavy flamer" },
        { id: "000002717:heavy-onslaught-gatling-cannon", name: "Heavy onslaught gatling cannon" },
        { id: "000002717:redemptor-fist", name: "Redemptor fist" },
    ],
    abilities: [],
};

const redemptorComposition = [
    { line: 1, description: "1 Redemptor Dreadnought", min: 1, max: 1 },
];

describe("parseDefaultLoadout", () => {
    it("splits a semicolon-separated equipment list", () => {
        const loadouts = parseDefaultLoadout(REDEMPTOR_RAW, redemptorComposition);
        expect(loadouts).toHaveLength(1);
        expect(loadouts[0].items.map((i) => i.name)).toEqual([
            "Twin fragstorm grenade launcher",
            "heavy flamer",
            "heavy onslaught gatling cannon",
            "Redemptor fist",
        ]);
    });

    it("names the model type from the unit composition when the text does not", () => {
        // "This model is equipped with:" says nothing about which model, so the
        // composition's first line supplies the name.
        const [loadout] = parseDefaultLoadout(REDEMPTOR_RAW, redemptorComposition);
        expect(loadout.modelType).toBe("Redemptor Dreadnought");
    });

    it("reads a per-model-type list", () => {
        const loadouts = parseDefaultLoadout(
            "<b>The Infernus Sergeant is equipped with:</b> bolt pistol; plasma pistol. <b>Each Infernus Marine is equipped with:</b> pyreblaster; close combat weapon.",
            [
                { line: 1, description: "1 Infernus Sergeant", min: 1, max: 1 },
                { line: 2, description: "4-9 Infernus Marines", min: 4, max: 9 },
            ],
        );
        expect(loadouts.map((l) => l.modelType)).toEqual([
            "Infernus Sergeant",
            "Infernus Marine",
        ]);
        expect(loadouts[1].items.map((i) => i.name)).toEqual([
            "pyreblaster",
            "close combat weapon",
        ]);
    });

    it('marks "Every model is equipped with" as applying to all', () => {
        const [loadout] = parseDefaultLoadout(
            "<b>Every model is equipped with:</b> bolt rifle; close combat weapon.",
            [{ line: 1, description: "5 Intercessors", min: 5, max: 5 }],
        );
        expect(loadout.modelType).toBe("*all*");
    });

    it("reads a leading count on an item", () => {
        const [loadout] = parseDefaultLoadout(
            "<b>This model is equipped with:</b> 2 heavy bolters; chainsword.",
            redemptorComposition,
        );
        expect(loadout.items).toEqual([
            { name: "heavy bolters", count: 2 },
            { name: "chainsword", count: 1 },
        ]);
    });

    it("returns nothing for empty text", () => {
        expect(parseDefaultLoadout("", redemptorComposition)).toEqual([]);
    });
});

describe("buildDefaultLoadout", () => {
    it("produces the Redemptor's block exactly as the target specifies", () => {
        const result = buildDefaultLoadout(
            REDEMPTOR_RAW,
            redemptorLookup,
            redemptorComposition,
        );
        expect(result).toEqual({
            raw: REDEMPTOR_RAW,
            parsed: [
                "000002717:twin-fragstorm-grenade-launcher",
                "000002717:heavy-flamer",
                "000002717:heavy-onslaught-gatling-cannon",
                "000002717:redemptor-fist",
            ],
            byModelType: {
                "Redemptor Dreadnought": [
                    "000002717:twin-fragstorm-grenade-launcher",
                    "000002717:heavy-flamer",
                    "000002717:heavy-onslaught-gatling-cannon",
                    "000002717:redemptor-fist",
                ],
            },
        });
    });

    it("keeps the raw text but empties the rest when a name cannot be resolved", () => {
        // An unresolvable name means the loadout is not understood. Emitting a
        // partial list would look like a complete answer.
        const result = buildDefaultLoadout(
            "<b>This model is equipped with:</b> mystery cannon.",
            redemptorLookup,
            redemptorComposition,
        );
        expect(result.raw).toContain("mystery cannon");
        expect(result.parsed).toEqual([]);
        expect(result.byModelType).toEqual({});
    });

    it("flattens to the *all* entry when one exists", () => {
        const result = buildDefaultLoadout(
            "<b>Every model is equipped with:</b> heavy flamer.",
            redemptorLookup,
            redemptorComposition,
        );
        expect(result.parsed).toEqual(["000002717:heavy-flamer"]);
        expect(result.byModelType).toEqual({
            "*all*": ["000002717:heavy-flamer"],
        });
    });

    it('reads "equipped with: nothing" as genuinely carrying no weapons', () => {
        // Drop Pods and terrain say this. It is a complete reading, not a
        // failure — "nothing" must not become a weapon name.
        const result = buildDefaultLoadout(
            "<b>This model is equipped with:</b> nothing.",
            redemptorLookup,
            redemptorComposition,
        );
        expect(result.parsed).toEqual([]);
        expect(result.byModelType).toEqual({ "Redemptor Dreadnought": [] });
    });

    it("returns an empty block for no text", () => {
        expect(buildDefaultLoadout("", redemptorLookup, redemptorComposition)).toEqual({
            raw: "",
            parsed: [],
            byModelType: {},
        });
    });
});
