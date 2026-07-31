import { describe, it, expect } from "vitest";
import { resolveHitRoll } from "../resolveHitRoll";
import { CombatContext } from "@/app/types/CombatContext";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";

const makeContext = (bsWs: number): CombatContext =>
    ({
        weaponProfile: { bsWs },
    }) as unknown as CombatContext;

describe("resolveHitRoll — weapons with no BS/WS", () => {
    const makeSkillless = (bsWs: unknown): CombatContext =>
        ({ weaponProfile: { bsWs } }) as unknown as CombatContext;

    it('hits automatically when BS/WS is "N/A"', () => {
        // Torrent and similar. targetRoll 0 is the existing auto-hit convention,
        // shared with the autoSuccess branch.
        const result = resolveHitRoll(makeSkillless("N/A"), new Map());
        expect(result.targetRoll).toBe(0);
        expect(result.modifiedValue).toBe(0);
    });

    it("does not let a modifier turn an auto-hit into a real roll", () => {
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("hit", { rollPenalty: 1, sources: [] });
        expect(resolveHitRoll(makeSkillless("N/A"), modifiers).targetRoll).toBe(0);
    });

    it("hits automatically for any unparseable skill rather than rolling 0+", () => {
        // Guards the old failure mode: bsWs null made Number(null) 0, which read
        // as auto-hit by accident and displayed as "0+".
        for (const bsWs of [null, undefined, "-", ""]) {
            expect(resolveHitRoll(makeSkillless(bsWs), new Map()).targetRoll).toBe(0);
        }
    });
});

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

    it("ignores skill (BS/WS) modifiers when hit.ignoreModifier is set (Psychic)", () => {
        // BS 3+, a -1 BS penalty (e.g. cover) is ignored → still 3+
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("hit", { ignoreModifier: true, sources: [] });
        modifiers.set("ballisticSkill", { rollPenalty: 1, sources: [] });
        const result = resolveHitRoll(makeContext(3), modifiers);
        expect(result.targetRoll).toBe(3);
    });

    it("ignores hit-roll modifiers too when ignoreModifier is set (bonuses included)", () => {
        // BS 3+, a +1 to-hit bonus is also ignored → still 3+
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("hit", { ignoreModifier: true, rollBonus: 1, sources: [] });
        const result = resolveHitRoll(makeContext(3), modifiers);
        expect(result.targetRoll).toBe(3);
    });
});
