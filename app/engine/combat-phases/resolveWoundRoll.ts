import { CombatContext } from "@/app/types/CombatContext";
import { PhaseResult } from "@/app/types/CombatResult";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { strengthVsToughness } from "../utils/strengthVsToughness";
import { clampRoll } from "../utils/clampRoll";
import { applyCharacteristicModifiers } from "../utils/applyCharacteristicModifiers";

export const resolveWoundRoll = (
    context: CombatContext,
    modifiers: ResolvedModifiers,
): PhaseResult => {
    const strength = context.weaponProfile.s;
    const toughness = context.defender.models[0].t;
    // baseValue stays the unmodified comparison so the lab can show the
    // datasheet figure next to the modified one.
    const baseWound = strengthVsToughness(strength, toughness);

    // Characteristic modifiers change S and T themselves, so they apply before
    // the comparison — a +3 Strength enhancement can shift the wound target by
    // more than the ±1 a roll modifier is capped to.
    const modifiedWoundTarget = strengthVsToughness(
        applyCharacteristicModifiers(strength, modifiers.get("strength")),
        applyCharacteristicModifiers(toughness, modifiers.get("toughness")),
    );

    const woundMods = modifiers.get("wound");

    if (woundMods?.autoSuccess) {
        return {
            baseValue: baseWound,
            modifiedValue: 0,
            modifiers,
            targetRoll: 0,
        };
    }

    let modifiedWound = modifiedWoundTarget;

    if (woundMods?.rollBonus) {
        modifiedWound -= woundMods.rollBonus;
    }
    if (woundMods?.rollPenalty) {
        modifiedWound += woundMods.rollPenalty;
    }

    modifiedWound = clampRoll(modifiedWound);

    if (woundMods?.criticalWound) {
        modifiedWound = Math.min(modifiedWound, woundMods.criticalWound);
    }

    return {
        baseValue: baseWound,
        modifiedValue: modifiedWound,
        modifiers,
        targetRoll: modifiedWound,
    };
};
