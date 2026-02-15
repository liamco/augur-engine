import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TestUnit } from "@/app/types/Test";
import { TaggedMechanic } from "./collectAllMechanics";

const collectFromUnit = (
    unit: TestUnit,
    perspective: "attacker" | "defender",
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];

    if (!unit.wargear?.abilities) return results;

    for (const wargearAbility of unit.wargear.abilities) {
        if (!wargearAbility.mechanics) continue;

        for (const mechanic of wargearAbility.mechanics) {
            results.push({
                mechanic: mechanic as unknown as Mechanic,
                layer: "wargearAbility",
                perspective,
            });
        }
    }

    return results;
};

export const collectWargearMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    return [
        ...collectFromUnit(context.attacker, "attacker"),
        ...collectFromUnit(context.defender, "defender"),
    ];
};
