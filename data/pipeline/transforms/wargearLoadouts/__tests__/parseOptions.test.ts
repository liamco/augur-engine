import { describe, it, expect } from "vitest";
import { parseOption, parseAllOptions } from "../parseOptions";

const option = (line: number, description: string) => ({
    datasheetId: "000002717",
    line,
    button: "•",
    description,
});

const parse = (description: string) => parseOption(option(1, description));

describe("parseOption — the Redemptor's four real options", () => {
    it('reads "This model can be equipped with 1 Icarus rocket pod."', () => {
        const result = parse("This model can be equipped with 1 Icarus rocket pod.");
        expect(result.wargearParsed).toBe(true);
        expect(result.targeting.type).toBe("this-model");
        expect(result.action.type).toBe("add");
        expect(result.action.removes).toEqual([]);
        expect(result.action.adds).toEqual([
            { weapons: [{ name: "Icarus rocket pod", count: 1 }], isPackage: false },
        ]);
    });

    it("reads a replacement written with a curly apostrophe", () => {
        // The source writes "This model’s heavy flamer" with U+2019. Patterns
        // matching only the straight apostrophe silently fail to target it.
        const result = parse(
            "This model’s heavy flamer can be replaced with 1 onslaught gatling cannon.",
        );
        expect(result.wargearParsed).toBe(true);
        expect(result.targeting.type).toBe("this-model");
        expect(result.action.type).toBe("replace");
        expect(result.action.removes).toEqual([{ name: "heavy flamer", count: 1 }]);
        expect(result.action.adds).toEqual([
            {
                weapons: [{ name: "onslaught gatling cannon", count: 1 }],
                isPackage: false,
            },
        ]);
    });

    it("reads the straight-apostrophe spelling identically", () => {
        const curly = parse(
            "This model’s heavy flamer can be replaced with 1 onslaught gatling cannon.",
        );
        const straight = parse(
            "This model's heavy flamer can be replaced with 1 onslaught gatling cannon.",
        );
        expect(straight.action).toEqual(curly.action);
        expect(straight.targeting).toEqual(curly.targeting);
    });

    it("parses all four of the Redemptor's options", () => {
        const parsed = parseAllOptions([
            option(1, "This model can be equipped with 1 Icarus rocket pod."),
            option(2, "This model’s heavy flamer can be replaced with 1 onslaught gatling cannon."),
            option(3, "This model’s heavy onslaught gatling cannon can be replaced with 1 macro plasma incinerator."),
            option(4, "This model’s twin fragstorm grenade launcher can be replaced with 1 twin storm bolter."),
        ]);
        expect(parsed).toHaveLength(4);
        expect(parsed.every((p) => p.wargearParsed)).toBe(true);
        expect(parsed.map((p) => p.line)).toEqual([1, 2, 3, 4]);
    });
});

describe("parseOption — targeting", () => {
    it("reads a specific model type via its possessive", () => {
        const result = parse(
            "The Sergeant’s chainsword can be replaced with 1 power fist.",
        );
        expect(result.targeting).toMatchObject({
            type: "specific-model",
            modelType: "Sergeant",
        });
    });

    it("reads a ratio", () => {
        const result = parse(
            "For every 5 models in this unit, 1 model’s bolt rifle can be replaced with 1 plasma gun.",
        );
        expect(result.targeting).toMatchObject({ type: "ratio", ratio: 5, count: 1 });
        // "model" is generic, not a named model type.
        expect(result.targeting.modelType).toBeUndefined();
    });

    it("reads an up-to-N cap with a model type", () => {
        const result = parse(
            "Up to 2 Dominions can each be equipped with 1 storm bolter.",
        );
        expect(result.targeting).toMatchObject({
            type: "count",
            count: 2,
            modelType: "Dominion",
        });
    });

    it("reads all-models", () => {
        expect(
            parse("All models in this unit can each be equipped with 1 chainsword.")
                .targeting.type,
        ).toBe("all-models");
    });

    it("reads any-number", () => {
        expect(
            parse("Any number of models can each have their bolt pistol replaced with 1 plasma pistol.")
                .targeting.type,
        ).toBe("any-number");
    });
});

describe("parseOption — choice lists", () => {
    it("reads an HTML <li> choice list", () => {
        const result = parse(
            "This model’s bolt rifle can be replaced with one of the following: <ul><li>1 plasma gun</li><li>1 meltagun</li></ul>",
        );
        expect(result.action.type).toBe("replace");
        expect(result.action.isChoiceList).toBe(true);
        expect(result.action.adds.map((a) => a.weapons[0].name)).toEqual([
            "plasma gun",
            "meltagun",
        ]);
    });

    it("reads a two-weapon package as one choice", () => {
        const result = parse(
            "This model’s bolt rifle can be replaced with 1 storm shield and 1 power sword.",
        );
        expect(result.action.adds).toHaveLength(1);
        expect(result.action.adds[0].isPackage).toBe(true);
        expect(result.action.adds[0].weapons.map((w) => w.name)).toEqual([
            "storm shield",
            "power sword",
        ]);
    });
});

describe("parseOption — constraints", () => {
    it("reads a duplicate restriction", () => {
        expect(
            parse("This model can be equipped with up to 2 of the following (cannot take duplicates): <ul><li>1 plasma gun</li></ul>")
                .constraints.noDuplicates,
        ).toBe(true);
    });

    it("reads a selection cap", () => {
        expect(
            parse("This model can be equipped with up to 2 of the following: <ul><li>1 plasma gun</li></ul>")
                .constraints.maxSelections,
        ).toBe(2);
    });
});

describe("parseOption — what it declines", () => {
    it('treats "None." as parsed but empty', () => {
        const result = parse("None.");
        expect(result.wargearParsed).toBe(true);
        expect(result.action.adds).toEqual([]);
        expect(result.action.removes).toEqual([]);
    });

    it("treats a footnote as parsed but empty", () => {
        const result = parse("* This model cannot be your Warlord.");
        expect(result.wargearParsed).toBe(true);
        expect(result.action.adds).toEqual([]);
    });

    it("reports wargearParsed false when neither targeting nor action match", () => {
        const result = parse(
            "Before the battle begins, you may exchange any wargear listed in the army roster appendix.",
        );
        expect(result.wargearParsed).toBe(false);
    });
});
