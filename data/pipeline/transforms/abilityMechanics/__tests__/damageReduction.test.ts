import { describe, it, expect } from "vitest";
import { damageReduction } from "../patterns/damageReduction";

const extract = (text: string) =>
    damageReduction.extract(text, { abilityName: "Duty Eternal" }) ?? [];

describe("damageReduction pattern", () => {
    it("reads the corpus's standard phrasing", () => {
        // Duty Eternal / Necrodermis / Armoured Resilience all read like this.
        expect(
            extract(
                "Each time an attack is allocated to this model, subtract 1 from the Damage characteristic of that attack.",
            ),
        ).toEqual([
            {
                name: "Duty Eternal",
                entity: "thisUnit",
                effect: "rollPenalty",
                attribute: "damage",
                value: 1,
            },
        ]);
    });

    it("reads a unit-wide variant", () => {
        const [mechanic] = extract(
            "Each time an attack is allocated to a model in this unit, subtract 1 from the Damage characteristic of that attack.",
        );
        expect(mechanic).toMatchObject({ attribute: "damage", value: 1 });
    });

    it("reads a larger reduction", () => {
        const [mechanic] = extract(
            "Each time an attack is allocated to this model, subtract 2 from the Damage characteristic of that attack.",
        );
        expect(mechanic.value).toBe(2);
    });

    it("reads halved damage as its own effect", () => {
        // Refuse to Yield. halveDamage already exists on the Effect union.
        expect(
            extract(
                "Each time an attack is allocated to this model, halve the Damage characteristic of that attack.",
            ),
        ).toEqual([
            {
                name: "Duty Eternal",
                entity: "thisUnit",
                effect: "halveDamage",
                attribute: "damage",
                value: true,
            },
        ]);
    });

    it("declines when the reduction is scoped in a way the type cannot express", () => {
        expect(
            extract(
                "Until the end of the phase, each time an attack is allocated to this model, subtract 1 from the Damage characteristic of that attack.",
            ),
        ).toEqual([]);
    });

    it("declines a minimum-damage clause, which is a different effect", () => {
        expect(
            extract(
                "The Damage characteristic of that attack cannot be reduced below 1.",
            ),
        ).toEqual([]);
    });

    it("declines text with no damage reduction", () => {
        expect(extract("Add 1 to the Hit roll.")).toEqual([]);
    });

    it("declines an attacker-side damage bonus, which is not a reduction", () => {
        expect(
            extract(
                "Each time this model makes an attack, add 1 to the Damage characteristic of that attack.",
            ),
        ).toEqual([]);
    });
});
