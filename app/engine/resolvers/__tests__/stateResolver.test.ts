import { describe, it, expect } from "vitest";
import { resolveState } from "../stateResolver";
import { CombatState } from "@/app/types/State";

const state = (over: Partial<CombatState> = {}): CombatState =>
    ({
        modelCount: 5,
        startingModelCount: 5,
        unitStrength: "full",
        deadModelIds: [],
        currentWounds: 2,
        movementBehaviour: "hold",
        chargeBehaviour: "hold",
        isDamaged: false,
        isDestroyed: false,
        isBattleShocked: false,
        isInEngagementRange: false,
        isInObjectiveRange: "none",
        isInCover: false,
        ...over,
    }) as CombatState;

describe("resolveState", () => {
    it("exposes startingModelCount, which is how bearer-scoped rules are gated", () => {
        // An Enhancement buffs one model. The engine cannot scope to a model, so
        // extraction gates those on the unit being a single model — which has to
        // read the *starting* count, not the current one.
        expect(resolveState("startingModelCount", state({ startingModelCount: 1 }))).toBe(1);
    });

    it("distinguishes startingModelCount from modelCount", () => {
        // A 5-model squad whittled down to 1 must not look like a single-model
        // unit, or it would acquire a bearer-only buff mid-game.
        const whittled = state({ startingModelCount: 5, modelCount: 1 });
        expect(resolveState("modelCount", whittled)).toBe(1);
        expect(resolveState("startingModelCount", whittled)).toBe(5);
    });

    it("still resolves the pre-existing states", () => {
        expect(resolveState("battleShock", state({ isBattleShocked: true }))).toBe(true);
        expect(resolveState("isBelowHalfStrength", state({ unitStrength: "belowHalf" }))).toBe(true);
        expect(resolveState("activeModels", state({ modelCount: 5, deadModelIds: ["a"] }))).toBe(4);
    });

    it("returns null for an unknown state", () => {
        expect(resolveState("noSuchState", state())).toBeNull();
    });

    it("falls back to customState", () => {
        expect(
            resolveState("isLeadingUnit", state({ customState: { isLeadingUnit: true } })),
        ).toBe(true);
    });
});
