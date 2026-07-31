import { CombatContext } from "@/app/types/CombatContext";
import { PhaseResult } from "@/app/types/CombatResult";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { clampSaveRoll } from "../utils/clampRoll";
import { applyCharacteristicModifiers } from "../utils/applyCharacteristicModifiers";

export const resolveSaveRoll = (
    context: CombatContext,
    modifiers: ResolvedModifiers,
): PhaseResult => {
    const baseSave = context.defender.models[0].sv;

    // The Save characteristic itself can be replaced ("the bearer has a Save
    // characteristic of 2+"). That happens before AP: a set save is a better
    // suit of armour, not immunity to armour-piercing.
    const effectiveArmour = applyCharacteristicModifiers(
        baseSave,
        modifiers.get("save"),
    );

    // AP is stored negative on the profile but applied as a magnitude, so a
    // modifier that "improves the Armour Penetration characteristic by 1" adds
    // to that magnitude rather than to the signed value.
    const ap = applyCharacteristicModifiers(
        Math.abs(context.weaponProfile.ap),
        modifiers.get("armourPenetration"),
    );

    // An invulnerable save can be granted to a model that had none, or improved.
    const invulnSave = resolveInvulnSave(
        context.defender.models[0].invSv,
        modifiers,
    );

    const armourSaveAfterAP = effectiveArmour + ap;

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

/**
 * The invulnerable save in play, which a mechanic can grant to a model that has
 * none or improve on one it already has.
 *
 * A granted save that is *worse* than the datasheet's does not replace it — a
 * model always uses the best invulnerable save available to it — so the two are
 * compared rather than the mechanic simply winning.
 */
const resolveInvulnSave = (
    datasheetInvuln: number | null,
    modifiers: ResolvedModifiers,
): number | null => {
    const mods = modifiers.get("invulnSave");
    if (!mods) return datasheetInvuln;

    const granted = mods.setsCharacteristic;
    const best =
        granted == null
            ? datasheetInvuln
            : datasheetInvuln == null
              ? granted
              : Math.min(datasheetInvuln, granted);

    if (best == null) return null;
    // A staticNumber here worsens the save, matching the sign convention on
    // every other characteristic (higher target = harder roll).
    return best + (mods.staticNumber ?? 0);
};
