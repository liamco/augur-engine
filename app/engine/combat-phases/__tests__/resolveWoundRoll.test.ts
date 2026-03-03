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
});
