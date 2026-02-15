export interface CombatState {
    modelCount: number;
    unitStrength: "full" | "belowStarting" | "belowHalf";
    deadModelIds: string[];
    currentWounds: number;
    isDamaged: boolean;
    isDestroyed: boolean;
    isBattleShocked: boolean;
    movementBehaviour: "hold" | "move" | "advance" | "fallBack";
    hasShot: boolean;
    hasCharged: boolean;
    hasFought: boolean;
    isInObjectiveRange: "none" | "friendly" | "enemy" | "contested";
    isInEngagementRange: boolean;
    isInCover: boolean;
    customState?: Record<string, boolean | number | string>;
}
