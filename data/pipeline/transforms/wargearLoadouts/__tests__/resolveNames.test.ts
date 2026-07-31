import { describe, it, expect } from "vitest";
import {
    cleanWeaponName,
    parseNumber,
    parseWeaponWithCount,
    resolveNameToId,
    stripPossessivePrefix,
    type NameLookup,
} from "../resolveNames";

const lookup: NameLookup = {
    datasheetId: "000002717",
    weapons: [
        { id: "000002717:heavy-flamer", name: "Heavy flamer" },
        { id: "000002717:macro-plasma-incinerator", name: "Macro plasma incinerator" },
        { id: "000002717:onslaught-gatling-cannon", name: "Onslaught gatling cannon" },
        { id: "000002717:heavy-bolter", name: "Heavy bolter" },
    ],
    abilities: [{ id: "wargear-ability:jump-pack", name: "Jump pack" }],
};

describe("parseNumber", () => {
    it("reads digits and spelled-out numbers", () => {
        expect(parseNumber("3")).toBe(3);
        expect(parseNumber("three")).toBe(3);
        expect(parseNumber("TEN")).toBe(10);
    });

    it("returns NaN for something that is not a number", () => {
        expect(parseNumber("several")).toBeNaN();
    });
});

describe("cleanWeaponName", () => {
    it("strips parentheticals, trailing punctuation and leading counts", () => {
        expect(cleanWeaponName("2 heavy bolters.")).toBe("heavy bolters");
        expect(cleanWeaponName("bolt rifle (grenade launcher)")).toBe("bolt rifle");
        expect(cleanWeaponName("plasma pistol;")).toBe("plasma pistol");
    });

    it("drops a dangling 'and'", () => {
        expect(cleanWeaponName("chainsword and")).toBe("chainsword");
    });

    it("collapses runs of whitespace", () => {
        expect(cleanWeaponName("heavy    flamer")).toBe("heavy flamer");
    });
});

describe("parseWeaponWithCount", () => {
    it("splits a leading count from the name", () => {
        expect(parseWeaponWithCount("3 heavy bolters")).toEqual({
            name: "heavy bolters",
            count: 3,
        });
    });

    it("defaults to a count of 1", () => {
        expect(parseWeaponWithCount("heavy flamer")).toEqual({
            name: "heavy flamer",
            count: 1,
        });
    });
});

describe("stripPossessivePrefix", () => {
    it("removes \"this model's\"", () => {
        expect(stripPossessivePrefix("this model's heavy flamer")).toBe("heavy flamer");
    });

    it("removes a named model's possessive", () => {
        expect(stripPossessivePrefix("the Sergeant's chainsword")).toBe("chainsword");
        expect(stripPossessivePrefix("each Terminator's storm bolter")).toBe(
            "storm bolter",
        );
    });

    it("removes a ratio preamble", () => {
        expect(
            stripPossessivePrefix(
                "For every 5 models in this unit, 1 Marine's bolt rifle ",
            ),
        ).toBe("bolt rifle");
    });

    it("leaves text with no possessive alone", () => {
        expect(stripPossessivePrefix("1 Icarus rocket pod")).toBe("1 Icarus rocket pod");
    });
});

describe("resolveNameToId", () => {
    it("matches a weapon by name, case-insensitively", () => {
        expect(resolveNameToId("heavy flamer", lookup)).toBe("000002717:heavy-flamer");
        expect(resolveNameToId("Heavy Flamer", lookup)).toBe("000002717:heavy-flamer");
    });

    it("matches a plural in the text against a singular datasheet name", () => {
        // Options say "2 heavy bolters"; the weapon is "Heavy bolter".
        expect(resolveNameToId("heavy bolters", lookup)).toBe("000002717:heavy-bolter");
    });

    it("matches a singular in the text against a plural datasheet name", () => {
        const plural: NameLookup = {
            ...lookup,
            weapons: [{ id: "000002717:kranak-grenades", name: "Kranak grenades" }],
        };
        expect(resolveNameToId("kranak grenade", plural)).toBe(
            "000002717:kranak-grenades",
        );
    });

    it("matches a wargear ability", () => {
        expect(resolveNameToId("jump pack", lookup)).toBe("wargear-ability:jump-pack");
    });

    it("returns null rather than inventing an id when nothing matches", () => {
        // The previous implementation slugged the raw text instead, which put
        // ids like "000001588:nothing" and whole sentences into the output —
        // 96 dangling references across 56 datasheets. A null lets the caller
        // record the option as unparsed.
        expect(resolveNameToId("plasma incinerator of doom", lookup)).toBeNull();
        expect(resolveNameToId("nothing", lookup)).toBeNull();
        expect(
            resolveNameToId(
                "up to 2 models can each have their shuriken pistol replaced with 1 fusion pistol",
                lookup,
            ),
        ).toBeNull();
    });

    it("returns null for empty or non-string input", () => {
        expect(resolveNameToId("", lookup)).toBeNull();
        expect(resolveNameToId("   ", lookup)).toBeNull();
    });

    it("matches across apostrophe spellings", () => {
        // Loadout prose and weapon names disagree on straight vs curly: the
        // Overlord's blade appears as "Overlord’s blade" in one and "Overlord's
        // blade" in the other depending on the row.
        const curly: NameLookup = {
            ...lookup,
            weapons: [{ id: "000000522:overlords-blade", name: "Overlord’s blade" }],
        };
        expect(resolveNameToId("Overlord's blade", curly)).toBe(
            "000000522:overlords-blade",
        );
        expect(resolveNameToId("Overlord’s blade", curly)).toBe(
            "000000522:overlords-blade",
        );
    });

    it("matches a name whose datasheet entry carries a parenthetical suffix", () => {
        // Loadouts say "gloom prism"; the wargear ability is "Gloom prism (Aura)".
        const aura: NameLookup = {
            ...lookup,
            abilities: [
                { id: "d:gloom-prism-aura", name: "Gloom prism (Aura)" },
                { id: "d:fabricator-claw-array-aura", name: "Fabricator claw array (Aura)" },
            ],
        };
        expect(resolveNameToId("gloom prism", aura)).toBe("d:gloom-prism-aura");
        expect(resolveNameToId("fabricator claw array", aura)).toBe(
            "d:fabricator-claw-array-aura",
        );
    });

    it("prefers an exact match over a parenthetical-stripped one", () => {
        const both: NameLookup = {
            ...lookup,
            weapons: [
                { id: "d:plain", name: "Storm shield" },
                { id: "d:suffixed", name: "Storm shield (Relic)" },
            ],
        };
        expect(resolveNameToId("storm shield", both)).toBe("d:plain");
    });

    it("matches across dash spellings", () => {
        const enDash: NameLookup = {
            ...lookup,
            weapons: [{ id: "000000001:hunter-killer", name: "Hunter–killer missile" }],
        };
        expect(resolveNameToId("Hunter-killer missile", enDash)).toBe(
            "000000001:hunter-killer",
        );
    });

    it("resolves against the real weapon id rather than re-slugging the name", () => {
        // Weapon ids come from the fetch stage's slug generator, which handles
        // apostrophes and collisions. Re-deriving them here would drift.
        const apostrophe: NameLookup = {
            ...lookup,
            weapons: [{ id: "000000218:lions-roar", name: "Lion's roar" }],
        };
        expect(resolveNameToId("Lion's roar", apostrophe)).toBe("000000218:lions-roar");
    });
});
