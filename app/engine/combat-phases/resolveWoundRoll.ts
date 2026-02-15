import { CombatContext } from "@/app/types/CombatContext";
import { PhaseResult } from "@/app/types/CombatResult";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { strengthVsToughness } from "../utils/strengthVsToughness";
import { clampRoll } from "../utils/clampRoll";

export const resolveWoundRoll = (
    context: CombatContext,
    modifiers: ResolvedModifiers,
): PhaseResult => {
    const strength = context.weaponProfile.s;
    const toughness = context.defender.models[0].t;
    const baseWound = strengthVsToughness(strength, toughness);

    const woundMods = modifiers.get("wound");

    if (woundMods?.autoSuccess) {
        return {
            baseValue: baseWound,
            modifiedValue: 0,
            modifiers,
            targetRoll: 0,
        };
    }

    let modifiedWound = baseWound;

    if (woundMods?.rollBonus) {
        modifiedWound -= woundMods.rollBonus;
    }
    if (woundMods?.rollPenalty) {
        modifiedWound += woundMods.rollPenalty;
    }

    modifiedWound = clampRoll(modifiedWound);

    return {
        baseValue: baseWound,
        modifiedValue: modifiedWound,
        modifiers,
        targetRoll: modifiedWound,
    };
};
