import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";

export const collectEnhancementMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];
    const attacker = context.attacker as { enhancement?: { mechanics?: any[] } };

    if (attacker.enhancement?.mechanics) {
        for (const mechanic of attacker.enhancement.mechanics) {
            results.push({
                mechanic,
                layer: "enhancement",
                perspective: "attacker",
            });
        }
    }

    return results;
};
