import { describe, it, expect } from "vitest";
import { extractDamagedMechanics } from "../damagedProfile";

describe("extractDamagedMechanics", () => {
    it("extracts the hit penalty", () => {
        expect(
            extractDamagedMechanics(
                "While this model has 1-4 wounds remaining, each time this model makes an attack, subtract 1 from the Hit roll.",
            ),
        ).toEqual([
            {
                name: "Damaged",
                entity: "thisUnit",
                effect: "rollPenalty",
                attribute: "hit",
                value: 1,
            },
        ]);
    });

    it("does NOT encode the wound threshold as a condition", () => {
        // collectDamagedMechanics only collects when combatState.isDamaged is
        // true, and damaged.threshold carries the number — re-encoding the
        // "1-4 wounds remaining" clause here would double-gate the mechanic.
        const [mechanic] = extractDamagedMechanics(
            "While this model has 1-4 wounds remaining, each time this model makes an attack, subtract 1 from the Hit roll.",
        )!;
        expect(mechanic.conditions).toBeUndefined();
    });

    it("extracts an Objective Control penalty alongside the hit penalty", () => {
        expect(
            extractDamagedMechanics(
                "While this model has 1-8 wounds remaining, subtract 4 from this model’s Objective Control characteristic and each time this model makes an attack, subtract 1 from the Hit roll.",
            ),
        ).toEqual([
            {
                name: "Damaged",
                entity: "thisUnit",
                effect: "rollPenalty",
                attribute: "hit",
                value: 1,
            },
            {
                name: "Damaged",
                entity: "thisUnit",
                effect: "rollPenalty",
                attribute: "objectiveControl",
                value: 4,
            },
        ]);
    });

    it("handles the 'its Objective Control' phrasing", () => {
        const out = extractDamagedMechanics(
            "While this model has 1-8 wounds remaining, subtract 4 from its Objective Control characteristic and each time this model makes an attack, subtract 1 from the Hit roll.",
        );
        expect(out?.map((m) => m.attribute)).toEqual(["hit", "objectiveControl"]);
    });

    it("declines when the description halves Attacks, which the type cannot express", () => {
        // Szarekh. Emitting only the hit penalty would understate how weakened
        // the unit is, so decline rather than half-express it.
        expect(
            extractDamagedMechanics(
                "While this unit’s Szarekh model has 1-6 wounds remaining, halve the Attacks characteristic of that model’s weapons, and each time this unit makes an attack, subtract 1 from the Hit roll.",
            ),
        ).toBeNull();
    });

    it("returns null for an empty or absent description", () => {
        expect(extractDamagedMechanics("")).toBeNull();
        expect(extractDamagedMechanics(null)).toBeNull();
    });
});
