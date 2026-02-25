import { CombatContext } from "@/app/types/CombatContext";
import { PhaseResult } from "@/app/types/CombatResult";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { parseDiceExpression } from "../utils/parseDiceExpression";
import { getUnitSurvivorCount } from "../utils/getUnitSurvivorCount";

export const resolveAttackCount = (
    context: CombatContext,
    modifiers: ResolvedModifiers,
): PhaseResult => {
    const survivorCount = getUnitSurvivorCount(context.attacker);
    const parsed = parseDiceExpression(context.weaponProfile.a);
    const baseTotal = parsed.expected * survivorCount;

    let modified = baseTotal;

    const attackMods = modifiers.get("attacks");
    if (attackMods) {
        if (attackMods.staticNumber) {
            modified += attackMods.staticNumber * survivorCount;
        }
        if (attackMods.rollBonus) {
            modified += attackMods.rollBonus * survivorCount;
        }
    }

    const result: PhaseResult = {
        baseValue: baseTotal,
        modifiedValue: Math.max(modified, 1),
        modifiers,
    };

    if (!parsed.isFixed) {
        result.baseDisplay = `${survivorCount} × ${parsed.expression}`;

        const diceMatch = parsed.expression.match(/^(\d*)D(\d+)([+-]\d+)?$/i);
        if (diceMatch) {
            const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
            const sides = parseInt(diceMatch[2]);
            const modifier = diceMatch[3] ? parseInt(diceMatch[3]) : 0;
            let perModelMin = count * 1 + modifier;
            let perModelMax = count * sides + modifier;

            if (attackMods?.staticNumber) {
                perModelMin += attackMods.staticNumber;
                perModelMax += attackMods.staticNumber;
            }
            if (attackMods?.rollBonus) {
                perModelMin += attackMods.rollBonus;
                perModelMax += attackMods.rollBonus;
            }

            const totalMin = Math.max(perModelMin * survivorCount, 1);
            const totalMax = perModelMax * survivorCount;
            result.modifiedDisplay = `${totalMin}–${totalMax}`;
        }
    }

    return result;
};
