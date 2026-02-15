import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";

export const collectStratagemMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];

    for (const stratagem of context.activeStratagems) {
        for (const mechanic of stratagem.mechanics) {
            results.push({
                mechanic,
                layer: "stratagem",
                perspective: stratagem.player,
            });
        }
    }

    return results;
};
