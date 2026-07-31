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

    // A weapon with no Ballistic or Weapon Skill — Torrent and a few others,
    // written "N/A" in the source — hits automatically. This has to be checked
    // before anything else: no modifier applies to a roll that is never made.
    //
    // Checked as "not a real skill" rather than `=== "N/A"` so the older `null`
    // and `"-"` spellings land here too. Previously they fell through to
    // Number(null) === 0 and were clamped up to 2, so 125 profiles were hitting
    // on 2+ instead of automatically.
    if (!Number.isFinite(baseSkill) || baseSkill <= 0) {
        return {
            baseValue: baseSkill,
            modifiedValue: 0,
            modifiers,
            targetRoll: 0,
        };
    }

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

    // Psychic and similar: `ignoreModifier` on the hit chance suppresses ALL
    // modifiers to it — both the BS/WS characteristic and the hit roll,
    // bonuses and penalties alike — leaving the raw weapon skill.
    if (!hitMods?.ignoreModifier) {
        // Characteristic modifiers to Ballistic Skill (shooting) or Weapon Skill
        // (melee) — e.g. Benefit of Cover's -1 BS penalty — adjust the skill
        // stat itself, before any hit-roll modifiers. Only one applies in a
        // given phase (mechanics are already phase-filtered), but both are read.
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
    }

    modifiedSkill = clampRoll(modifiedSkill);

    return {
        baseValue: baseSkill,
        modifiedValue: modifiedSkill,
        modifiers,
        targetRoll: modifiedSkill,
    };
};
