import { describe, it, expect } from "vitest";
import { characteristics } from "../patterns/characteristics";

const extract = (text: string) =>
    characteristics.extract(text, { abilityName: "Test" }) ?? [];

describe("characteristics pattern", () => {
    describe("invulnerable saves", () => {
        it("sets the save rather than adding to it", () => {
            // "has a 4+ invulnerable save" replaces the characteristic. Emitting
            // staticNumber would add 4 to it now that resolveSaveRoll consumes
            // invulnSave modifiers.
            expect(extract("The bearer has a 4+ invulnerable save.")).toEqual([
                {
                    name: "Test",
                    entity: "thisUnit",
                    effect: "setsCharacteristic",
                    attribute: "invulnSave",
                    value: 4,
                },
            ]);
        });

        it("reads the trailing phrasing too", () => {
            const [mechanic] = extract("This model has an invulnerable save of 5+.");
            expect(mechanic).toMatchObject({
                effect: "setsCharacteristic",
                attribute: "invulnSave",
                value: 5,
            });
        });
    });

    describe("Save characteristic", () => {
        it("sets the armour save", () => {
            const [mechanic] = extract(
                "The bearer has a Save characteristic of 2+.",
            );
            expect(mechanic).toMatchObject({
                effect: "setsCharacteristic",
                attribute: "save",
                value: 2,
            });
        });
    });

    describe("additive characteristics", () => {
        it("uses staticNumber for Attacks, which is not capped at 1", () => {
            // rollBonus is clamped to 1 by effectResolver, so "add 2" would
            // silently become "add 1".
            const [mechanic] = extract(
                "Add 2 to the Attacks characteristic of this model's melee weapons.",
            );
            expect(mechanic).toMatchObject({
                effect: "staticNumber",
                attribute: "attacks",
                value: 2,
            });
        });

        it("uses staticNumber for Strength", () => {
            const [mechanic] = extract(
                "Add 3 to the Strength characteristic of the bearer's melee weapons.",
            );
            expect(mechanic).toMatchObject({
                effect: "staticNumber",
                attribute: "strength",
                value: 3,
            });
        });

        it("uses staticNumber for Toughness", () => {
            const [mechanic] = extract(
                "Add 1 to the Toughness characteristic of this model.",
            );
            expect(mechanic).toMatchObject({
                effect: "staticNumber",
                attribute: "toughness",
                value: 1,
            });
        });

        it("uses staticNumber for Wounds", () => {
            const [mechanic] = extract(
                "Add 1 to the bearer's Wounds characteristic.",
            );
            expect(mechanic).toMatchObject({
                effect: "staticNumber",
                attribute: "wounds",
                value: 1,
            });
        });

        it("improves Armour Penetration by adding to its magnitude", () => {
            const [mechanic] = extract(
                "Improve the Armour Penetration characteristic of that attack by 1.",
            );
            expect(mechanic).toMatchObject({
                effect: "staticNumber",
                attribute: "armourPenetration",
                value: 1,
            });
        });
    });

    it("returns null when no characteristic is named", () => {
        expect(characteristics.extract("Add 1 to the Hit roll.", { abilityName: "T" })).toBeNull();
    });

    describe("declines when the description's scope cannot be expressed", () => {
        it("declines a critical-roll trigger", () => {
            // Piercing Talons. Extracted flat, this would improve AP on every
            // attack rather than only on critical wounds.
            expect(
                extract(
                    "Each time a model in the bearer's unit makes an attack, on a Critical Wound, improve the Armour Penetration characteristic of that attack by 1.",
                ),
            ).toEqual([]);
        });

        it("declines a temporary duration", () => {
            // Bio-stimulus: real rule is melee-only, versus a marked unit, once
            // per turn. None of that survives extraction.
            expect(
                extract(
                    "In your Shooting phase, after this model has shot, select one enemy unit hit by one or more of those attacks. Until the end of the turn, each time a friendly TYRANIDS unit makes a melee attack that targets that enemy unit, improve the Armour Penetration characteristic of that attack by 1.",
                ),
            ).toEqual([]);
        });

        it("declines a once-per-battle invulnerable save", () => {
            expect(
                extract(
                    "Once per battle, at the start of any phase, this model can use this ability. If it does, until the end of the phase, this model has a 2+ invulnerable save.",
                ),
            ).toEqual([]);
        });

        it("declines an aura", () => {
            expect(
                extract(
                    'While a friendly Tyranids unit is within 6" of this unit, models in that unit have a 6+ invulnerable save.',
                ),
            ).toEqual([]);
        });

        it("still extracts an unqualified modifier", () => {
            expect(
                extract("Add 3 to the Strength characteristic of the bearer's melee weapons."),
            ).toHaveLength(1);
        });
    });
});
