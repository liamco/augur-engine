import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";
import benefitOfCover from "@/app/library/unit-states/benefit-of-cover.json";

export const collectCoreRuleMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];

    if (context.defender.combatState.isInCover) {
        results.push({
            mechanic: benefitOfCover as unknown as Mechanic,
            layer: "unitAbility",
            perspective: "defender",
            stateSource: "benefitOfCover",
        });
    }

    return results;
};
