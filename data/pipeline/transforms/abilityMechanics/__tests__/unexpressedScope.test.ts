import { describe, it, expect } from "vitest";
import { hasUnexpressedScope } from "../guards";

describe("hasUnexpressedScope", () => {
    it("catches a duration the Mechanic type cannot express", () => {
        expect(
            hasUnexpressedScope(
                "Until the end of the turn, improve the Armour Penetration characteristic of that attack by 1.",
            ),
        ).toBe(true);
    });

    it("catches a once-per limit", () => {
        expect(
            hasUnexpressedScope(
                "Once per battle, at the start of any phase, this model has a 2+ invulnerable save.",
            ),
        ).toBe(true);
        expect(hasUnexpressedScope("The first time the bearer is destroyed, add 1.")).toBe(
            true,
        );
    });

    it("catches a critical-roll trigger", () => {
        // The engine has no "on a critical wound, then…" trigger, so an AP bonus
        // extracted from this would apply to every attack instead of the crits.
        expect(
            hasUnexpressedScope(
                "Each time a model in the bearer's unit makes an attack, on a Critical Wound, improve the Armour Penetration characteristic of that attack by 1.",
            ),
        ).toBe(true);
    });

    it("catches an aura range, which nothing tracks", () => {
        expect(
            hasUnexpressedScope(
                'While a friendly NECRONS unit is within 3" of this Fortification, models in that unit have a 5+ invulnerable save.',
            ),
        ).toBe(true);
    });

    it("catches a target-marking step", () => {
        expect(
            hasUnexpressedScope(
                "After this model has shot, select one enemy unit hit by one or more of those attacks.",
            ),
        ).toBe(true);
    });

    it("catches an effect scoped to a subset of attacks", () => {
        // Psychic Hood grants Feel No Pain 4+ *against Psychic Attacks*. Nothing
        // tracks the attack's source, so extracting it flat hands the unit
        // blanket FNP against everything.
        expect(
            hasUnexpressedScope(
                "While this model is leading a unit, models in that unit have the Feel No Pain 4+ ability against Psychic Attacks.",
            ),
        ).toBe(true);
        expect(
            hasUnexpressedScope("Models in this unit have the Feel No Pain 5+ ability against mortal wounds."),
        ).toBe(true);
    });

    it("does not catch an ordinary 'against' clause naming a target", () => {
        // "against that unit" restricts who is attacked, which conditions and
        // phase already express — not the damage source.
        expect(
            hasUnexpressedScope(
                "Each time a model in this unit makes an attack against that unit, add 1 to the Hit roll.",
            ),
        ).toBe(false);
        expect(
            hasUnexpressedScope("Add 1 to the Hit roll against an enemy unit."),
        ).toBe(false);
    });

    it("passes a plain, unconditional characteristic modifier", () => {
        expect(
            hasUnexpressedScope(
                "Add 3 to the Strength characteristic of the bearer's melee weapons.",
            ),
        ).toBe(false);
        expect(hasUnexpressedScope("The bearer has a Save characteristic of 2+.")).toBe(
            false,
        );
    });

    it("passes a scope the emitted mechanic does carry", () => {
        // "melee attacks" becomes phase: ["fight"], and unit scope is handled by
        // bearerScope — neither is unexpressed.
        expect(
            hasUnexpressedScope(
                "Add 1 to the Strength characteristic of melee weapons equipped by models in the bearer's unit.",
            ),
        ).toBe(false);
    });
});
