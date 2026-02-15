import { ResolvedModifiers } from "./ResolvedModifiers";

export interface PhaseResult {
    baseValue: number;
    modifiedValue: number;
    modifiers: ResolvedModifiers;
    targetRoll?: number;
}

export interface DamageResult {
    baseDamage: number | string;
    resolvedDamage: number;
    modifiers: ResolvedModifiers;
}

export interface CombatResult {
    attackCount: PhaseResult;
    hitPhase: PhaseResult;
    woundPhase: PhaseResult;
    savePhase: PhaseResult;
    damagePhase: DamageResult;
    feelNoPain: PhaseResult | null;
}
