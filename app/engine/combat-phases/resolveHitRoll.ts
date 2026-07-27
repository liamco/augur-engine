import { CombatContext } from "@/app/types/CombatContext";
import { PhaseResult } from "@/app/types/CombatResult";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { clampRoll } from "../utils/clampRoll";

export const resolveHitRoll = (
    context: CombatContext,
    modifiers: ResolvedModifiers,
): PhaseResult => {
    const baseSkill = Number(context.weaponProfile.bsWs);
    const hitMods = modifiers.get("hit");

    if (hitMods?.ignoreBehaviour || hitMods?.autoSuccess) {
        return {
            baseValue: baseSkill,
            modifiedValue: 0,
            modifiers,
            targetRoll: 0,
        };
    }

    if (hitMods?.rollBlock) {
        return {
            baseValue: baseSkill,
            modifiedValue: 7,
            modifiers,
            targetRoll: 7,
        };
    }

    let modifiedSkill = baseSkill;

    // Characteristic modifiers to Ballistic Skill (shooting) or Weapon Skill
    // (melee) — e.g. Benefit of Cover's -1 BS penalty — adjust the skill stat
    // itself, before any hit-roll modifiers. Only one applies in a given phase
    // (mechanics are already phase-filtered), but both buckets are read.
    for (const attr of ["ballisticSkill", "weaponSkill"] as const) {
        const skillMods = modifiers.get(attr);
        if (skillMods?.rollBonus) {
            modifiedSkill -= skillMods.rollBonus;
        }
        if (skillMods?.rollPenalty) {
            modifiedSkill += skillMods.rollPenalty;
        }
    }

    if (hitMods?.rollBonus) {
        modifiedSkill -= hitMods.rollBonus;
    }
    if (hitMods?.rollPenalty) {
        modifiedSkill += hitMods.rollPenalty;
    }

    modifiedSkill = clampRoll(modifiedSkill);

    return {
        baseValue: baseSkill,
        modifiedValue: modifiedSkill,
        modifiers,
        targetRoll: modifiedSkill,
    };
};
