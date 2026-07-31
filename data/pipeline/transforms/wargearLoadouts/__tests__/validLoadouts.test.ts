import { describe, it, expect } from "vitest";
import { generateValidLoadouts, modelTypesMatch } from "../validLoadouts";
import { parseAllOptions } from "../parseOptions";

const REDEMPTOR = {
    datasheetId: "000002717",
    weapons: [
        { id: "000002717:heavy-flamer", name: "Heavy flamer" },
        { id: "000002717:heavy-onslaught-gatling-cannon", name: "Heavy onslaught gatling cannon" },
        { id: "000002717:icarus-rocket-pod", name: "Icarus rocket pod" },
        { id: "000002717:macro-plasma-incinerator", name: "Macro plasma incinerator" },
        { id: "000002717:onslaught-gatling-cannon", name: "Onslaught gatling cannon" },
        { id: "000002717:twin-fragstorm-grenade-launcher", name: "Twin fragstorm grenade launcher" },
        { id: "000002717:twin-storm-bolter", name: "Twin storm bolter" },
        { id: "000002717:redemptor-fist", name: "Redemptor fist" },
    ],
    abilities: [],
    defaultLoadoutRaw:
        "<b>This model is equipped with:</b> Twin fragstorm grenade launcher; heavy flamer; heavy onslaught gatling cannon; Redemptor fist.",
    unitComposition: [
        { line: 1, description: "1 Redemptor Dreadnought", min: 1, max: 1 },
    ],
    options: parseAllOptions([
        { line: 1, description: "This model can be equipped with 1 Icarus rocket pod." },
        { line: 2, description: "This model’s heavy flamer can be replaced with 1 onslaught gatling cannon." },
        { line: 3, description: "This model’s heavy onslaught gatling cannon can be replaced with 1 macro plasma incinerator." },
        { line: 4, description: "This model’s twin fragstorm grenade launcher can be replaced with 1 twin storm bolter." },
    ]),
};

const short = (combo: string[]) => combo.map((id) => id.split(":")[1]).sort();

describe("modelTypesMatch", () => {
    it("matches exactly and across plurals", () => {
        expect(modelTypesMatch("Terminator", "Terminators")).toBe(true);
        expect(modelTypesMatch("Terminators", "Terminator")).toBe(true);
        expect(modelTypesMatch("Missionaries", "Missionary")).toBe(true);
    });

    it("does not substring-match a longer model name", () => {
        // A rule for "Terminator" must not capture "Terminator Sergeant".
        expect(modelTypesMatch("Terminator", "Terminator Sergeant")).toBe(false);
    });

    it("does not strip a double-s ending", () => {
        expect(modelTypesMatch("Assassin", "Assassins")).toBe(true);
        expect(modelTypesMatch("Battle Sister", "Battle Sisters")).toBe(true);
    });
});

describe("generateValidLoadouts — the Redemptor", () => {
    const result = generateValidLoadouts(REDEMPTOR);

    it("produces one 'any' group, since the unit is a single model type", () => {
        expect(result.allResolved).toBe(true);
        expect(result.groups).toHaveLength(1);
        expect(result.groups[0].modelType).toBe("any");
    });

    it("enumerates all 16 legal combinations", () => {
        // 2 (fragstorm/storm bolter) x 2 (flamer or gatling swap) x 2 (gatling or
        // plasma) x 2 (with or without the rocket pod) = 16.
        expect(result.groups[0].items).toHaveLength(16);
    });

    it("starts from the default loadout", () => {
        expect(short(result.groups[0].items[0])).toEqual([
            "heavy-flamer",
            "heavy-onslaught-gatling-cannon",
            "redemptor-fist",
            "twin-fragstorm-grenade-launcher",
        ]);
    });

    it("includes the fully swapped combination", () => {
        const combos = result.groups[0].items.map(short);
        expect(combos).toContainEqual([
            "icarus-rocket-pod",
            "macro-plasma-incinerator",
            "onslaught-gatling-cannon",
            "redemptor-fist",
            "twin-storm-bolter",
        ]);
    });

    it("keeps the Redemptor fist in every combination — it is never replaced", () => {
        for (const combo of result.groups[0].items) {
            expect(combo).toContain("000002717:redemptor-fist");
        }
    });

    it("never lists a combination twice", () => {
        const keys = result.groups[0].items.map((c) => short(c).join("|"));
        expect(new Set(keys).size).toBe(keys.length);
    });

    it("never references a weapon the datasheet does not have", () => {
        const valid = new Set(REDEMPTOR.weapons.map((w) => w.id));
        for (const combo of result.groups[0].items) {
            for (const id of combo) expect(valid.has(id)).toBe(true);
        }
    });
});

describe("generateValidLoadouts — per model type", () => {
    it("keeps model types separate when their loadouts differ", () => {
        const result = generateValidLoadouts({
            datasheetId: "000000126",
            weapons: [
                { id: "000000126:bolt-pistol", name: "Bolt pistol" },
                { id: "000000126:plasma-pistol", name: "Plasma pistol" },
                { id: "000000126:pyreblaster", name: "Pyreblaster" },
                { id: "000000126:close-combat-weapon", name: "Close combat weapon" },
            ],
            abilities: [],
            defaultLoadoutRaw:
                "<b>The Infernus Sergeant is equipped with:</b> bolt pistol; close combat weapon. <b>Each Infernus Marine is equipped with:</b> pyreblaster; close combat weapon.",
            unitComposition: [
                { line: 1, description: "1 Infernus Sergeant", min: 1, max: 1 },
                { line: 2, description: "4-9 Infernus Marines", min: 4, max: 9 },
            ],
            options: parseAllOptions([
                {
                    line: 1,
                    description:
                        "The Infernus Sergeant’s bolt pistol can be replaced with 1 plasma pistol.",
                },
            ]),
        });

        expect(result.groups.map((g) => g.modelType).sort()).toEqual([
            "Infernus Marine",
            "Infernus Sergeant",
        ]);
        const sergeant = result.groups.find((g) => g.modelType === "Infernus Sergeant")!;
        // Default plus the plasma pistol swap.
        expect(sergeant.items).toHaveLength(2);
        // The option targets the Sergeant, so the Marines keep one loadout.
        const marine = result.groups.find((g) => g.modelType === "Infernus Marine")!;
        expect(marine.items).toHaveLength(1);
    });
});

describe("generateValidLoadouts — honesty", () => {
    it("reports allResolved false when an option names an unknown weapon", () => {
        const result = generateValidLoadouts({
            ...REDEMPTOR,
            options: parseAllOptions([
                {
                    line: 1,
                    description:
                        "This model’s heavy flamer can be replaced with 1 mystery cannon.",
                },
            ]),
        });
        expect(result.allResolved).toBe(false);
    });

    it("reports allResolved false when an option could not be parsed at all", () => {
        const result = generateValidLoadouts({
            ...REDEMPTOR,
            options: parseAllOptions([
                { line: 1, description: "Consult the appendix for permitted exchanges." },
            ]),
        });
        expect(result.allResolved).toBe(false);
    });

    it("treats a 'None.' option as nothing to do, still resolved", () => {
        const result = generateValidLoadouts({
            ...REDEMPTOR,
            options: parseAllOptions([{ line: 1, description: "None." }]),
        });
        expect(result.allResolved).toBe(true);
        expect(result.groups[0].items).toHaveLength(1);
    });

    it("returns no groups when there is no default loadout to build from", () => {
        const result = generateValidLoadouts({
            ...REDEMPTOR,
            defaultLoadoutRaw: "",
            options: [],
        });
        expect(result.groups).toEqual([]);
    });
});
