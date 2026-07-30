import { describe, it, expect } from "vitest";
import { rollModifiers } from "../patterns/rollModifiers";

const run = (text: string) => rollModifiers.extract(text, { abilityName: "Test" });

describe("rollModifiers", () => {
    it("emits an attacker's own hit bonus against thisUnit", () => {
        expect(
            run(
                "Each time a model in this unit makes an attack that targets a CHARACTER unit, add 1 to the Hit roll.",
            ),
        ).toEqual([
            {
                name: "Test",
                entity: "thisUnit",
                effect: "rollBonus",
                attribute: "hit",
                value: 1,
            },
        ]);
    });

    it("emits an imposed hit penalty against opposingUnit", () => {
        // Direction matters: with entity thisUnit this mechanic would resolve to
        // the defender, but `hit` is an attacker-owned attribute, so
        // filterByTarget would drop it and the rule would silently do nothing.
        expect(
            run("Each time a ranged attack targets this unit, subtract 1 from the Hit roll."),
        ).toEqual([
            {
                name: "Test",
                entity: "opposingUnit",
                effect: "rollPenalty",
                attribute: "hit",
                value: 1,
                phase: ["shooting"],
            },
        ]);
    });

    it("restricts a melee-only modifier to the fight phase", () => {
        expect(
            run("Each time this model makes a melee attack, add 1 to the Wound roll."),
        ).toEqual([
            {
                name: "Test",
                entity: "thisUnit",
                effect: "rollBonus",
                attribute: "wound",
                value: 1,
                phase: ["fight"],
            },
        ]);
    });

    it("declines when the direction is unclear", () => {
        expect(run("Add 1 to the Hit roll.")).toBeNull();
    });

    it("declines a description with two modifiers under different conditions", () => {
        expect(
            run(
                "Each time this model makes an attack, add 1 to the Hit roll. If the target is Battle-shocked, add 1 to the Wound roll as well.",
            ),
        ).toBeNull();
    });

    it("returns null when there is no roll modifier at all", () => {
        expect(run("This unit has the Scouts 6\" ability.")).toBeNull();
    });
});
