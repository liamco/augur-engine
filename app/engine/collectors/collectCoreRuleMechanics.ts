import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";
import benefitOfCover from "@/app/library/combat-states/benefit-of-cover.json";
import hidden from "@/app/library/combat-states/hidden.json";

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

    // Hidden (targeting eligibility) — pushed unconditionally; its conditions
    // gate hasShot==false + benefitOfCover + INFANTRY/SWARM/BEAST.
    results.push({
        mechanic: hidden as unknown as Mechanic,
        layer: "unitAbility",
        perspective: "defender",
    });

    return results;
};
