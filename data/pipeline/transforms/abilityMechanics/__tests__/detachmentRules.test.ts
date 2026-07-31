import { describe, it, expect } from "vitest";
import {
    extractDetachmentRuleMechanics,
    stripEligibilityPrefix,
} from "../index";
import { SINGLE_MODEL_CONDITION } from "../bearerScope";

describe("stripEligibilityPrefix", () => {
    it("removes the '<KEYWORD> model only.' restriction", () => {
        // The restriction is already captured by the enhancement's
        // eligibleDatasheets, so leaving it in only gives the patterns noise to
        // match against.
        expect(
            stripEligibilityPrefix("NECRONS model only. The bearer has the Stealth ability."),
        ).toBe("The bearer has the Stealth ability.");
    });

    it("handles multi-word and mixed-case keywords", () => {
        expect(
            stripEligibilityPrefix("ADEPTUS ASTARTES INFANTRY model only. Add 1."),
        ).toBe("Add 1.");
        expect(stripEligibilityPrefix("Wolf Guard Battle Leader model only. Add 1.")).toBe(
            "Add 1.",
        );
        expect(
            stripEligibilityPrefix("C'tan Shard of the Deceiver model only. Add 1."),
        ).toBe("Add 1.");
    });

    it("handles the 'unit only' and plural variants", () => {
        expect(stripEligibilityPrefix("NECRONS unit only. Add 1.")).toBe("Add 1.");
        expect(stripEligibilityPrefix("CRYPTEK models only. Add 1.")).toBe("Add 1.");
    });

    it("leaves a description with no restriction alone", () => {
        expect(stripEligibilityPrefix("In each player's Command phase, add 1.")).toBe(
            "In each player's Command phase, add 1.",
        );
    });

    it("does not strip a mid-sentence mention", () => {
        const text = "Add 1 if the target is a NECRONS model only when charging.";
        expect(stripEligibilityPrefix(text)).toBe(text);
    });
});

describe("extractDetachmentRuleMechanics", () => {
    it("extracts a bearer-scoped enhancement gated on a single-model unit", () => {
        const { mechanics } = extractDetachmentRuleMechanics(
            "Enaegic Dermal Bond",
            "NECRONS model only. The bearer has the Feel No Pain 4+ ability.",
            "bearer",
        );
        expect(mechanics).toHaveLength(1);
        expect(mechanics[0]).toMatchObject({
            name: "Enaegic Dermal Bond",
            effect: "setsFnp",
            attribute: "feelNoPain",
            value: 4,
        });
        expect(mechanics[0].conditions).toEqual([SINGLE_MODEL_CONDITION]);
    });

    it("extracts a unit-scoped enhancement with no single-model gate", () => {
        const { mechanics } = extractDetachmentRuleMechanics(
            "Hyperphasic Fulcrum",
            "While the bearer is leading a unit, models in that unit have the Feel No Pain 5+ ability.",
            "bearer",
        );
        expect(mechanics).toHaveLength(1);
        expect(mechanics[0].conditions).toBeUndefined();
    });

    it("declines a description whose clauses have different scopes", () => {
        const { mechanics } = extractDetachmentRuleMechanics(
            "Oath of Macragge",
            "Add 1 to the Attacks characteristic of the bearer's melee weapons. While the bearer is leading a unit, models in that unit have the Feel No Pain 6+ ability.",
            "bearer",
        );
        expect(mechanics).toEqual([]);
    });

    it("sets an invulnerable save rather than adding to it", () => {
        const { mechanics } = extractDetachmentRuleMechanics(
            "Cryptometric Experimentation",
            "The bearer has a 4+ invulnerable save.",
            "bearer",
        );
        expect(mechanics[0]).toMatchObject({
            effect: "setsCharacteristic",
            attribute: "invulnSave",
            value: 4,
        });
    });

    it("returns nothing for a description it cannot parse", () => {
        const { mechanics, matchedPatterns } = extractDetachmentRuleMechanics(
            "Veil of Darkness",
            "Once per battle, at the end of your opponent's turn, the bearer can use this Enhancement.",
            "bearer",
        );
        expect(mechanics).toEqual([]);
        expect(matchedPatterns).toEqual([]);
    });

    it("treats a detachment ability's implicit subject as the unit, not a bearer", () => {
        // A detachment rule applies to units from your army, so with no scope
        // phrase it must not acquire a single-model gate.
        const { mechanics } = extractDetachmentRuleMechanics(
            "Combat Doctrines",
            "Each time a unit from your army makes a ranged attack, add 1 to the Hit roll.",
            "unit",
        );
        expect(mechanics.length).toBeGreaterThan(0);
        expect(mechanics[0].conditions).toBeUndefined();
    });
});
