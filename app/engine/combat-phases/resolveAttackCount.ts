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
    const baseAttacksPerModel = parseDiceExpression(
        context.weaponProfile.a,
    ).expected;
    const baseTotal = baseAttacksPerModel * survivorCount;

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

    return {
        baseValue: baseTotal,
        modifiedValue: Math.max(modified, 1),
        modifiers,
    };
};
