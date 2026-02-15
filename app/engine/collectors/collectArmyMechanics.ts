import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";

export const collectArmyMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];

    for (const mechanic of context.attackerArmyMechanics) {
        results.push({
            mechanic,
            layer: "armyRule",
            perspective: "attacker",
        });
    }

    for (const mechanic of context.defenderArmyMechanics) {
        results.push({
            mechanic,
            layer: "armyRule",
            perspective: "defender",
        });
    }

    return results;
};
