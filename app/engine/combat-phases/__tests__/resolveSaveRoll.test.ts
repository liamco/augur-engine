import { describe, it, expect } from "vitest";
import { resolveSaveRoll } from "../resolveSaveRoll";
import { CombatContext } from "@/app/types/CombatContext";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";

const makeContext = (
    sv: number,
    ap: number,
    invSv: number | null = null,
): CombatContext =>
    ({
        defender: { models: [{ sv, invSv }] },
        weaponProfile: { ap },
    }) as unknown as CombatContext;

describe("resolveSaveRoll", () => {
    it("returns the armour save when there is no AP", () => {
        const result = resolveSaveRoll(makeContext(3, 0), new Map());
        expect(result.baseValue).toBe(3);
        expect(result.targetRoll).toBe(3);
    });

    it("worsens the save by the weapon's AP", () => {
        // Sv 3+ against AP -2 → 5+
        expect(resolveSaveRoll(makeContext(3, -2), new Map()).targetRoll).toBe(5);
    });

    it("lets a save be worsened past 6+, which cannot be made", () => {
        // Sv 3+ against AP -4 → 7+. Unlike hit and wound rolls there is no "a 6
        // always succeeds" rule for saves, so clamping to 6+ would hand the model
        // a save the rules do not allow.
        expect(resolveSaveRoll(makeContext(3, -4), new Map()).targetRoll).toBe(7);
    });

    it("keeps going past 7 so the margin is not lost", () => {
        expect(resolveSaveRoll(makeContext(6, -4), new Map()).targetRoll).toBe(10);
    });

    it("still uses an invulnerable save when armour becomes unmakeable", () => {
        // Sv 3+, AP -4 → armour 7+, but a 4++ invuln is unaffected by AP.
        expect(resolveSaveRoll(makeContext(3, -4, 4), new Map()).targetRoll).toBe(4);
    });

    it("prefers armour when it is better than the invuln", () => {
        expect(resolveSaveRoll(makeContext(2, 0, 4), new Map()).targetRoll).toBe(2);
    });

    it("never improves a save beyond 2+, since an unmodified 1 always fails", () => {
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("save", { rollBonus: 3, sources: [] });
        expect(resolveSaveRoll(makeContext(2, 0), modifiers).targetRoll).toBe(2);
    });

    it("applies a save rollPenalty on top of AP", () => {
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("save", { rollPenalty: 1, sources: [] });
        expect(resolveSaveRoll(makeContext(3, -1), modifiers).targetRoll).toBe(5);
    });

    it("ignores a save rollBonus when ignoreModifier is set", () => {
        const modifiers: ResolvedModifiers = new Map();
        modifiers.set("save", {
            rollBonus: 1,
            ignoreModifier: true,
            sources: [],
        });
        expect(resolveSaveRoll(makeContext(4, 0), modifiers).targetRoll).toBe(4);
    });
});
