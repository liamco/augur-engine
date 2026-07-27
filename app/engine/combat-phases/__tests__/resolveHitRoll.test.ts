import { describe, it, expect } from "vitest";
import { resolveHitRoll } from "../resolveHitRoll";
import { CombatContext } from "@/app/types/CombatContext";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";

const makeContext = (bsWs: number): CombatContext =>
    ({
        weaponProfile: { bsWs },
    }) as unknown as CombatContext;

describe("resolveHitRoll", () => {
    it("returns the weapon's BS/WS as the hit target with no modifiers", () => {
        const modifiers: ResolvedModifiers = new Map();
        const result = resolveHitRoll(makeContext(3), modifiers);
        expect(result.baseValue).toBe(3);
        expect(result.targetRoll).toBe(3);
    });

    it("worsens the hit target when a ballisticSkill rollPenalty applies", () => {
        // BS 3+ with a -1 BS penalty (e.g. Benefit of Cover) → hits on 4+
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("ballisticSkill", { rollPenalty: 1, sources: [] });
        const result = resolveHitRoll(makeContext(3), modifiers);
        expect(result.baseValue).toBe(3);
        expect(result.targetRoll).toBe(4);
    });

    it("worsens the hit target when a weaponSkill rollPenalty applies", () => {
        // WS 3+ with a -1 WS penalty (a melee-phase characteristic modifier) → 4+
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("weaponSkill", { rollPenalty: 1, sources: [] });
        const result = resolveHitRoll(makeContext(3), modifiers);
        expect(result.targetRoll).toBe(4);
    });

    it("improves the hit target when a ballisticSkill rollBonus applies", () => {
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("ballisticSkill", { rollBonus: 1, sources: [] });
        const result = resolveHitRoll(makeContext(4), modifiers);
        expect(result.targetRoll).toBe(3);
    });

    it("stacks skill (characteristic) and hit (roll) penalties", () => {
        // BS 3+, -1 BS and -1 to hit → 5+
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("ballisticSkill", { rollPenalty: 1, sources: [] });
        modifiers.set("hit", { rollPenalty: 1, sources: [] });
        const result = resolveHitRoll(makeContext(3), modifiers);
        expect(result.targetRoll).toBe(5);
    });
});
