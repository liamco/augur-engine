import { CombatContext } from "@/app/types/CombatContext";
import { DamageResult } from "@/app/types/CombatResult";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { parseDiceExpression } from "../utils/parseDiceExpression";

export const resolveDamage = (
    context: CombatContext,
    modifiers: ResolvedModifiers,
): DamageResult => {
    const rawDamage = context.weaponProfile.d;
    const baseDamage = parseDiceExpression(rawDamage).expected;

    let resolved = baseDamage;

    const damageMods = modifiers.get("damage");
    if (damageMods?.halveDamage) {
        resolved = Math.ceil(resolved / 2);
    }
    if (damageMods?.minDamage && resolved < damageMods.minDamage) {
        resolved = damageMods.minDamage;
    }

    return {
        baseDamage: rawDamage,
        resolvedDamage: Math.max(1, resolved),
        modifiers,
    };
};
