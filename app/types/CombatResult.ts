import { ResolvedModifiers } from "./ResolvedModifiers";

export interface PhaseResult {
    baseValue: number;
    modifiedValue: number;
    modifiers: ResolvedModifiers;
    targetRoll?: number;
    baseDisplay?: string;
    modifiedDisplay?: string;
}

export interface DamageResult {
    baseDamage: number | string;
    resolvedDamage: number;
    modifiers: ResolvedModifiers;
}

export interface TargetEligibility {
    eligible: boolean;
    reason: string | null;
}

export interface CombatResult {
    attackCount: PhaseResult;
    hitPhase: PhaseResult;
    woundPhase: PhaseResult;
    savePhase: PhaseResult;
    damagePhase: DamageResult;
    feelNoPain: PhaseResult | null;
    eligibility: TargetEligibility;
}
