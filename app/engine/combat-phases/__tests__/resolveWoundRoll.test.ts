import { describe, it, expect } from "vitest";
import { resolveWoundRoll } from "../resolveWoundRoll";
import { CombatContext } from "@/app/types/CombatContext";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";

const makeContext = (strength: number, toughness: number): CombatContext =>
    ({
        weaponProfile: { s: strength },
        defender: { models: [{ t: toughness }] },
    }) as unknown as CombatContext;

describe("resolveWoundRoll", () => {
    it("returns the base S vs T wound target with no modifiers", () => {
        const modifiers: ResolvedModifiers = new Map();
        const result = resolveWoundRoll(makeContext(4, 4), modifiers);
        expect(result.targetRoll).toBe(4);
    });

    it("returns 3+ when strength is greater than toughness", () => {
        const modifiers: ResolvedModifiers = new Map();
        const result = resolveWoundRoll(makeContext(5, 4), modifiers);
        expect(result.targetRoll).toBe(3);
    });

    it("returns 0 (auto) when autoSuccess is set", () => {
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("wound", { autoSuccess: true, sources: [] });
        const result = resolveWoundRoll(makeContext(4, 4), modifiers);
        expect(result.targetRoll).toBe(0);
    });

    it("lowers wound target when criticalWound is below normal wound", () => {
        // S4 vs T8 → normally 6+, but anti 4+ brings it to 4+
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("wound", { criticalWound: 4, sources: [] });
        const result = resolveWoundRoll(makeContext(4, 8), modifiers);
        expect(result.baseValue).toBe(6);
        expect(result.targetRoll).toBe(4);
    });

    it("does not raise wound target when criticalWound is above normal wound", () => {
        // S5 vs T4 → normally 3+, anti 4+ should not make it worse
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("wound", { criticalWound: 4, sources: [] });
        const result = resolveWoundRoll(makeContext(5, 4), modifiers);
        expect(result.baseValue).toBe(3);
        expect(result.targetRoll).toBe(3);
    });

    it("criticalWound applies after roll modifiers", () => {
        // S4 vs T4 → 4+, +1 penalty → 5+, anti 4+ → 4+
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("wound", {
            rollPenalty: 1,
            criticalWound: 4,
            sources: [],
        });
        const result = resolveWoundRoll(makeContext(4, 4), modifiers);
        expect(result.targetRoll).toBe(4);
    });

    describe("characteristic modifiers", () => {
        it("raises strength before comparing to toughness", () => {
            // "Add 3 to the Strength characteristic": S4 vs T8 → 6+, S7 vs T8 → 5+
            const modifiers: ResolvedModifiers = new Map();
            modifiers.set("strength", { staticNumber: 3, sources: [] });
            const result = resolveWoundRoll(makeContext(4, 8), modifiers);
            expect(result.baseValue).toBe(6);
            expect(result.targetRoll).toBe(5);
        });

        it("raises toughness before comparing to strength", () => {
            // "Add 1 to the Toughness characteristic": S5 vs T4 → 3+, S5 vs T5 → 4+
            const modifiers: ResolvedModifiers = new Map();
            modifiers.set("toughness", { staticNumber: 1, sources: [] });
            const result = resolveWoundRoll(makeContext(5, 4), modifiers);
            expect(result.targetRoll).toBe(4);
        });

        it("does not cap a characteristic modifier at 1, unlike a roll modifier", () => {
            // S4 +3 = S7. Capping at +1 would leave S5 vs T8 → 6+, not 5+.
            const modifiers: ResolvedModifiers = new Map();
            modifiers.set("strength", { staticNumber: 3, sources: [] });
            expect(resolveWoundRoll(makeContext(4, 8), modifiers).targetRoll).toBe(5);
        });

        it("applies a setsCharacteristic toughness in place of the datasheet value", () => {
            // T4 replaced by T8 against S5: 3+ becomes 5+
            const modifiers: ResolvedModifiers = new Map();
            modifiers.set("toughness", { setsCharacteristic: 8, sources: [] });
            const result = resolveWoundRoll(makeContext(5, 4), modifiers);
            expect(result.targetRoll).toBe(5);
        });

        it("adds staticNumber on top of a set characteristic", () => {
            const modifiers: ResolvedModifiers = new Map();
            modifiers.set("toughness", {
                setsCharacteristic: 4,
                staticNumber: 1,
                sources: [],
            });
            // T set to 4, then +1 = T5 vs S5 → 4+
            expect(resolveWoundRoll(makeContext(5, 4), modifiers).targetRoll).toBe(4);
        });

        it("stacks a characteristic modifier with a wound-roll modifier", () => {
            // S4 +3 = S7 vs T8 → 5+, then +1 to the roll → 4+
            const modifiers: ResolvedModifiers = new Map();
            modifiers.set("strength", { staticNumber: 3, sources: [] });
            modifiers.set("wound", { rollBonus: 1, sources: [] });
            expect(resolveWoundRoll(makeContext(4, 8), modifiers).targetRoll).toBe(4);
        });

        it("reports the unmodified S vs T as baseValue so the lab can show both", () => {
            const modifiers: ResolvedModifiers = new Map();
            modifiers.set("strength", { staticNumber: 3, sources: [] });
            const result = resolveWoundRoll(makeContext(4, 8), modifiers);
            expect(result.baseValue).toBe(6);
        });
    });
});
