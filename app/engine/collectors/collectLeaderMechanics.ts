import { CombatContext } from "@/app/types/CombatContext";
import { TestUnit } from "@/app/types/Test";
import { TaggedMechanic } from "./collectAllMechanics";

const collectFromUnit = (
    unit: TestUnit,
    perspective: "attacker" | "defender",
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];

    if (!unit.abilities) return results;

    for (const ability of unit.abilities) {
        if (!ability.isFromLeader) continue;
        if (!ability.mechanics) continue;

        for (const mechanic of ability.mechanics) {
            results.push({
                mechanic,
                layer: "leaderAbility",
                perspective,
            });
        }
    }

    return results;
};

export const collectLeaderMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    return [
        ...collectFromUnit(context.attacker, "attacker"),
        ...collectFromUnit(context.defender, "defender"),
    ];
};
