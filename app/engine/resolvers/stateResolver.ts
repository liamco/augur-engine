import { CombatState } from "@/app/types/State";

export const resolveState = (
    stateKey: string,
    combatState: CombatState,
): boolean | number | string | null => {
    const stateMap: Record<string, boolean | number | string | null> = {
        activeModels: combatState.modelCount - combatState.deadModelIds.length,
        battleShock: combatState.isBattleShocked,
        damaged: combatState.isDamaged,
        benefitOfCover: combatState.isInCover,
        hasShot: combatState.hasShot ?? null,
        unitStrength: combatState.unitStrength,
        isBelowStartingStrength: combatState.unitStrength !== "full",
        isBelowHalfStrength: combatState.unitStrength === "belowHalf",
        movementBehaviour: combatState.movementBehaviour,
        isInEngagementRange: combatState.isInEngagementRange,
        isInObjectiveRange: combatState.isInObjectiveRange,
        chargeBehaviour: combatState.chargeBehaviour,
        isDestroyed: combatState.isDestroyed,
        modelCount: combatState.modelCount,
        /**
         * Models the unit began with. Distinct from modelCount because it is how
         * bearer-scoped rules are gated: an Enhancement buffs a single model, and
         * the engine has no model scoping, so extraction emits
         * `startingModelCount === 1` to mean "bearer and unit are the same
         * model". Reading the live count instead would hand the buff to a squad
         * whittled down to one survivor.
         */
        startingModelCount: combatState.startingModelCount,
        currentWounds: combatState.currentWounds,
    };

    if (stateKey in stateMap) {
        return stateMap[stateKey];
    }

    if (combatState.customState && stateKey in combatState.customState) {
        return combatState.customState[stateKey];
    }

    return null;
};
