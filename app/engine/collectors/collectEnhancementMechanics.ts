import { CombatContext } from "@/app/types/CombatContext";
import { TestUnit } from "@/app/types/Test";
import { TaggedMechanic } from "./collectAllMechanics";

/**
 * Mechanics from the Enhancement carried by each unit's CHARACTER model.
 *
 * Both sides are collected. Enhancements skew defensive — a set Save
 * characteristic, an invulnerable save, Feel No Pain — so collecting only the
 * attacker would leave the whole layer unable to fire in the case where it
 * matters most.
 */
export const collectEnhancementMechanics = (
    context: CombatContext,
): TaggedMechanic[] => [
    ...forSide(context.attacker, "attacker"),
    ...forSide(context.defender, "defender"),
];

const forSide = (
    unit: TestUnit | undefined,
    perspective: "attacker" | "defender",
): TaggedMechanic[] =>
    (unit?.enhancement?.mechanics ?? []).map((mechanic) => ({
        mechanic,
        layer: "enhancement" as const,
        perspective,
    }));
