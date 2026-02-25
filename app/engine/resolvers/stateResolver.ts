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
        unitStrength: combatState.unitStrength,
        isBelowStartingStrength: combatState.unitStrength !== "full",
        isBelowHalfStrength: combatState.unitStrength === "belowHalf",
        movementBehaviour: combatState.movementBehaviour,
        isInEngagementRange: combatState.isInEngagementRange,
        isInObjectiveRange: combatState.isInObjectiveRange,
        chargeBehaviour: combatState.chargeBehaviour,
        isDestroyed: combatState.isDestroyed,
        modelCount: combatState.modelCount,
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
