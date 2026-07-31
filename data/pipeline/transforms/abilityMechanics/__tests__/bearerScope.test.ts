import { describe, it, expect } from "vitest";
import {
    applyScope,
    classifyScope,
    SINGLE_MODEL_CONDITION,
} from "../bearerScope";
import type { Mechanic } from "@/app/types/Mechanic";

const fnp = (): Mechanic => ({
    name: "Enaegic Dermal Bond",
    entity: "thisUnit",
    effect: "setsFnp",
    attribute: "feelNoPain",
    value: 4,
});

describe("classifyScope", () => {
    it("reads an effect on the bearer's whole unit as unit-scoped", () => {
        expect(
            classifyScope(
                "Each time a model in the bearer's unit makes an attack, add 1 to the Hit roll.",
                "bearer",
            ),
        ).toBe("unit");
    });

    it("treats 'while the bearer is leading a unit' as a condition, not a bearer effect", () => {
        // The bearer is only mentioned to establish which unit is affected —
        // the effect lands on the unit. Matching the mention would misclassify it.
        expect(
            classifyScope(
                "While the bearer is leading a unit, models in that unit have the Stealth ability.",
                "bearer",
            ),
        ).toBe("unit");
    });

    it("reads an effect on the bearer alone as bearer-scoped", () => {
        expect(classifyScope("The bearer has the Feel No Pain 4+ ability.", "unit")).toBe(
            "bearer",
        );
        expect(
            classifyScope("Add 1 to the Toughness characteristic of the bearer.", "unit"),
        ).toBe("bearer");
        expect(
            classifyScope(
                "Add 3 to the Strength characteristic of the bearer's melee weapons.",
                "unit",
            ),
        ).toBe("bearer");
    });

    it("declines when one description does both", () => {
        // Oath of Macragge: a bearer weapon buff plus a unit-wide clause. Split
        // scope needs a human — emitting either alone is wrong.
        expect(
            classifyScope(
                "Add 1 to the Attacks characteristic of the bearer's melee weapons. While the bearer is leading a unit, models in that unit have the Feel No Pain 6+ ability.",
                "bearer",
            ),
        ).toBe("split");
    });

    it("falls back to the caller's default when no scope phrase appears", () => {
        // An enhancement's implicit subject is its bearer; a detachment rule's is
        // a unit from your army, so the default has to come from the caller.
        expect(classifyScope("Add 1 to the Hit roll.", "bearer")).toBe("bearer");
        expect(classifyScope("Add 1 to the Hit roll.", "unit")).toBe("unit");
    });
});

describe("applyScope", () => {
    it("leaves unit-scoped mechanics untouched", () => {
        const mechanics = [fnp()];
        expect(applyScope(mechanics, "unit")).toEqual(mechanics);
    });

    it("gates bearer-scoped mechanics on the unit being a single model", () => {
        const [mechanic] = applyScope([fnp()], "bearer")!;
        expect(mechanic.conditions).toEqual([SINGLE_MODEL_CONDITION]);
    });

    it("keeps any conditions the pattern already emitted", () => {
        const withCondition: Mechanic = {
            ...fnp(),
            conditions: [
                {
                    entity: "targetUnit",
                    state: "isBelowHalfStrength",
                    operator: "equals",
                    value: true,
                },
            ],
        };
        const [mechanic] = applyScope([withCondition], "bearer")!;
        expect(mechanic.conditions).toHaveLength(2);
        expect(mechanic.conditions).toContainEqual(SINGLE_MODEL_CONDITION);
    });

    it("does not mutate the mechanics it was given", () => {
        const original = fnp();
        applyScope([original], "bearer");
        expect(original.conditions).toBeUndefined();
    });

    it("declines everything on a split scope", () => {
        expect(applyScope([fnp()], "split")).toBeNull();
    });

    it("gates the single-model condition on startingModelCount, not modelCount", () => {
        expect(SINGLE_MODEL_CONDITION).toEqual({
            entity: "thisUnit",
            state: "startingModelCount",
            operator: "equals",
            value: 1,
        });
    });
});
