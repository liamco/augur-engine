import { TestUnit } from "@/app/types/Test";
import { CombatState } from "@/app/types/State";

/**
 * A sensible default runtime combat state for a unit, derived from its
 * datasheet. combatState is runtime-only (not stored in the codex), so this
 * seeds it when a unit enters resolution. Any explicit combatState on the unit
 * overrides these defaults (see buildCombatContext).
 */
export const createDefaultCombatState = (unit: TestUnit): CombatState => {
    // Model count comes from unitComposition, NOT models[].composition. The
    // latter is built by joining composition lines to statlines by index, which
    // is unsound — it reports max 1 for a 5-10 model squad. unitComposition sums
    // its lines to the real figure ("1 Sergeant" + "4-9 Marines" = 5-10).
    const composition = unit.unitComposition ?? [];
    const modelCount =
        composition.length > 0
            ? composition.reduce((total, line) => total + line.min, 0)
            : 1;

    // Wounds remaining on the model currently taking damage — a per-model figure,
    // so it can be compared directly against damaged.threshold, which is also
    // per-model. For a single-model unit this is the whole unit's wounds.
    const currentWounds = unit.models?.[0]?.w ?? 1;

    return {
        modelCount,
        startingModelCount: modelCount,
        unitStrength: "full",
        deadModelIds: [],
        currentWounds,
        movementBehaviour: "hold",
        chargeBehaviour: "hold",
        isDamaged: false,
        isDestroyed: false,
        isBattleShocked: false,
        isInEngagementRange: false,
        isInObjectiveRange: "none",
        isInCover: false,
    };
};
