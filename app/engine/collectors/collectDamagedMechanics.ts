import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TestUnit } from "@/app/types/Test";
import { TaggedMechanic } from "./collectAllMechanics";

const collectFromUnit = (
    unit: TestUnit,
    perspective: "attacker" | "defender",
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];

    if (!unit.damaged || !unit.combatState.isDamaged) return results;

    for (const damagedMechanic of unit.damaged.mechanics) {
        results.push({
            mechanic: damagedMechanic as unknown as Mechanic,
            layer: "damagedProfile",
            perspective,
        });
    }

    return results;
};

export const collectDamagedMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    return [
        ...collectFromUnit(context.attacker, "attacker"),
        ...collectFromUnit(context.defender, "defender"),
    ];
};
