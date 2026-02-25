import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";
import { filterByConditions } from "../resolvers/conditionResolver";
import sustainedHits from "@/app/library/weapon-attributes/sustained-hits.json";
import lethalHits from "@/app/library/weapon-attributes/lethal-hits.json";
import devastatingWounds from "@/app/library/weapon-attributes/devastating-wounds.json";

const weaponAttributeRegistry: Record<string, Mechanic> = {
    sustainedhits: sustainedHits as unknown as Mechanic,
    letalhits: lethalHits as unknown as Mechanic,
    devastatingwounds: devastatingWounds as unknown as Mechanic,
};

const sanitize = (str: string): string =>
    str.replace(/\s+/g, "").toLowerCase();

export const expandWeaponAttributeMechanics = (
    mechanics: TaggedMechanic[],
    context: CombatContext,
): TaggedMechanic[] => {
    const adds = mechanics.filter(tm => tm.mechanic.effect === "addsWeaponAttribute");
    const rest = mechanics.filter(tm => tm.mechanic.effect !== "addsWeaponAttribute");

    const activeAdds = filterByConditions(adds, context);

    const expanded: TaggedMechanic[] = [];
    for (const tagged of activeAdds) {
        if (!tagged.mechanic.weaponAttributes) continue;
        for (const name of tagged.mechanic.weaponAttributes) {
            const baseMechanic = weaponAttributeRegistry[sanitize(name)];
            if (baseMechanic) {
                const mechanic = baseMechanic.value === "$param"
                    ? { ...baseMechanic, value: tagged.mechanic.value }
                    : baseMechanic;
                expanded.push({
                    mechanic,
                    layer: "weaponAttribute",
                    perspective: tagged.perspective,
                });
            }
        }
    }

    return [...rest, ...expanded];
};
