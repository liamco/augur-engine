export interface CombatState {
    modelCount: number;
    unitStrength: "full" | "belowStarting" | "belowHalf";
    deadModelIds: string[];
    currentWounds: number;
    movementBehaviour: "hold" | "move" | "advance" | "fallBack" | null;
    chargeBehaviour: "hold" | "charge" | null;
    isDamaged: boolean;
    isDestroyed: boolean;
    isBattleShocked: boolean;
    isInEngagementRange: boolean;
    isInObjectiveRange: "none" | "friendly" | "enemy" | "contested";
    isInCover: boolean;
    customState?: Record<string, boolean | number | string>;
}
