export interface CombatState {
    modelCount: number;
    /**
     * Models the unit began the battle with, so unit strength can be derived
     * without the caller remembering it separately. Seeded from unitComposition.
     */
    startingModelCount: number;
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
    hasShot?: boolean; // has shot this/last turn; blocks the Hidden state. Absent = not tracked (treated as not-shot-gated)
    customState?: Record<string, boolean | number | string>;
}
