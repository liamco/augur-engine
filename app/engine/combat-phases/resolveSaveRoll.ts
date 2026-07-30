import { CombatContext } from "@/app/types/CombatContext";
import { PhaseResult } from "@/app/types/CombatResult";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { clampSaveRoll } from "../utils/clampRoll";

export const resolveSaveRoll = (
    context: CombatContext,
    modifiers: ResolvedModifiers,
): PhaseResult => {
    const baseSave = context.defender.models[0].sv;
    const invulnSave = context.defender.models[0].invSv;
    const ap = Math.abs(context.weaponProfile.ap);

    const armourSaveAfterAP = baseSave + ap;

    let modifiedArmourSave = armourSaveAfterAP;
    const saveMods = modifiers.get("save");

    if (saveMods?.rollBonus && !saveMods.ignoreModifier) {
        modifiedArmourSave -= saveMods.rollBonus;
    }
    if (saveMods?.rollPenalty) {
        modifiedArmourSave += saveMods.rollPenalty;
    }

    // Floored at 2+ but deliberately not capped at 6+ — a save can be worsened
    // out of reach, in which case no save is possible at all.
    modifiedArmourSave = clampSaveRoll(modifiedArmourSave);

    let effectiveSave = modifiedArmourSave;
    if (invulnSave !== null && invulnSave < effectiveSave) {
        effectiveSave = invulnSave;
    }

    return {
        baseValue: baseSave,
        modifiedValue: effectiveSave,
        modifiers,
        targetRoll: effectiveSave,
    };
};
