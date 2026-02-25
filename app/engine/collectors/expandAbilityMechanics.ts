import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";
import { filterByConditions } from "../resolvers/conditionResolver";
import stealth from "@/app/library/unit-abilities/stealth.json";
import benefitOfCover from "@/app/library/unit-states/benefit-of-cover.json";

const abilityRegistry: Record<string, Mechanic> = {
    stealth: stealth as unknown as Mechanic,
    benefitofcover: benefitOfCover as unknown as Mechanic,
};

const sanitize = (str: string): string => {
    return str.replace(/\s+/g, "").toLowerCase();
};

export const expandAbilityMechanics = (
    mechanics: TaggedMechanic[],
    context: CombatContext,
): TaggedMechanic[] => {
    const addsAbility = mechanics.filter(tm => tm.mechanic.effect === "addsAbility");
    const rest = mechanics.filter(tm => tm.mechanic.effect !== "addsAbility");

    // Evaluate conditions on the addsAbility mechanics themselves
    const activeAdds = filterByConditions(addsAbility, context);

    // Look up each granted ability in the registry
    const expanded: TaggedMechanic[] = [];
    for (const tagged of activeAdds) {
        if (!tagged.mechanic.abilities) continue;
        for (const name of tagged.mechanic.abilities) {
            const mechanic = abilityRegistry[sanitize(name)];
            if (mechanic) {
                expanded.push({
                    mechanic,
                    layer: "unitAbility",
                    perspective: tagged.perspective,
                });
            }
        }
    }

    return [...rest, ...expanded];
};
