import { describe, it, expect } from "vitest";
import { createDefaultCombatState } from "../createDefaultCombatState";
import { deriveUnitStrength } from "../deriveUnitStrength";
import type { TestUnit } from "@/app/types/Test";

const unit = (over: Partial<TestUnit> = {}) =>
    ({
        models: [{ w: 2, composition: { min: 1, max: 1 } }],
        unitComposition: [
            { line: 1, description: "1 Sergeant", min: 1, max: 1 },
            { line: 2, description: "4-9 Marines", min: 4, max: 9 },
        ],
        ...over,
    }) as unknown as TestUnit;

describe("createDefaultCombatState", () => {
    it("takes model count from unitComposition, not models[].composition", () => {
        // models[].composition is built by an unsound line-join and reports 1 for
        // a 5-10 model squad; unitComposition sums to the real minimum.
        const state = createDefaultCombatState(unit());
        expect(state.modelCount).toBe(5);
        expect(state.startingModelCount).toBe(5);
    });

    it("sets currentWounds to one model's wounds, not the whole pool", () => {
        // currentWounds means "wounds remaining on the model taking damage", so it
        // can be compared against damaged.threshold, which is a per-model figure.
        expect(createDefaultCombatState(unit()).currentWounds).toBe(2);
    });

    it("handles a single-model unit", () => {
        const state = createDefaultCombatState(
            unit({
                models: [{ w: 12, composition: { min: 1, max: 1 } }],
                unitComposition: [
                    { line: 1, description: "1 Redemptor Dreadnought", min: 1, max: 1 },
                ],
            } as never),
        );
        expect(state.modelCount).toBe(1);
        expect(state.startingModelCount).toBe(1);
        expect(state.currentWounds).toBe(12);
    });

    it("falls back to 1 model when unitComposition is missing", () => {
        const state = createDefaultCombatState(
            unit({ unitComposition: undefined } as never),
        );
        expect(state.modelCount).toBe(1);
    });

    it("starts at full strength", () => {
        expect(createDefaultCombatState(unit()).unitStrength).toBe("full");
    });
});

describe("deriveUnitStrength", () => {
    it("is full while no models have been lost", () => {
        expect(deriveUnitStrength({ current: 10, starting: 10 })).toBe("full");
    });

    it("is belowStarting after any loss", () => {
        expect(deriveUnitStrength({ current: 9, starting: 10 })).toBe("belowStarting");
    });

    it("is belowHalf at or below half strength", () => {
        // 11th ed: Battle-shock triggers at half strength as well as below it.
        expect(deriveUnitStrength({ current: 5, starting: 10 })).toBe("belowHalf");
        expect(deriveUnitStrength({ current: 4, starting: 10 })).toBe("belowHalf");
    });

    it("treats an odd starting count correctly", () => {
        expect(deriveUnitStrength({ current: 3, starting: 5 })).toBe("belowStarting");
        expect(deriveUnitStrength({ current: 2, starting: 5 })).toBe("belowHalf");
    });

    it("never reports below-half above the starting count", () => {
        expect(deriveUnitStrength({ current: 12, starting: 10 })).toBe("full");
    });
});
