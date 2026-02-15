import { CombatContext } from "@/app/types/CombatContext";
import { PhaseResult } from "@/app/types/CombatResult";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";

export const resolveFeelNoPain = (
    context: CombatContext,
    modifiers: ResolvedModifiers,
): PhaseResult | null => {
    const fnpMods = modifiers.get("feelNoPain");
    let fnpValue: number | null = null;

    if (fnpMods?.setsFnp) {
        fnpValue = fnpMods.setsFnp;
    }

    // Check abilities for FNP parameter
    if (fnpValue === null && context.defender.abilities) {
        for (const ability of context.defender.abilities) {
            if (ability.mechanics) {
                for (const mechanic of ability.mechanics) {
                    if (mechanic.effect === "setsFnp") {
                        fnpValue = Number(mechanic.value);
                        break;
                    }
                }
            }
            if (fnpValue !== null) break;
        }
    }

    if (fnpValue === null || isNaN(fnpValue)) {
        return null;
    }

    return {
        baseValue: fnpValue,
        modifiedValue: fnpValue,
        modifiers,
        targetRoll: fnpValue,
    };
};
