import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";

export const collectDetachmentMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];

    for (const mechanic of context.attackerDetachmentMechanics) {
        results.push({
            mechanic,
            layer: "detachmentRule",
            perspective: "attacker",
        });
    }

    for (const mechanic of context.defenderDetachmentMechanics) {
        results.push({
            mechanic,
            layer: "detachmentRule",
            perspective: "defender",
        });
    }

    return results;
};
