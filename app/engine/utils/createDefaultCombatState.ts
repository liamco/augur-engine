import { TestUnit } from "@/app/types/Test";
import { CombatState } from "@/app/types/State";

/**
 * A sensible default runtime combat state for a unit, derived from its
 * datasheet. combatState is runtime-only (not stored in the codex), so this
 * seeds it when a unit enters resolution. Any explicit combatState on the unit
 * overrides these defaults (see buildCombatContext).
 */
export const createDefaultCombatState = (unit: TestUnit): CombatState => {
    const model = unit.models?.[0];
    const modelCount = model?.composition?.min ?? 1;
    const wounds = model?.w ?? 1;
    return {
        modelCount,
        unitStrength: "full",
        deadModelIds: [],
        currentWounds: modelCount * wounds,
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
