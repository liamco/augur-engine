import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";
import { filterByConditions } from "../resolvers/conditionResolver";
import { parseParameterisedName } from "../utils/parseParameterisedName";
import { hydrateMechanic } from "../utils/hydrateMechanic";
import { weaponAttributeRegistry } from "@/app/library/weapon-attributes";

export const expandWeaponAttributeMechanics = (
    mechanics: TaggedMechanic[],
    context: CombatContext,
): TaggedMechanic[] => {
    const adds = mechanics.filter(
        (tm) => tm.mechanic.effect === "addsWeaponAttribute",
    );
    const rest = mechanics.filter(
        (tm) => tm.mechanic.effect !== "addsWeaponAttribute",
    );

    const activeAdds = filterByConditions(adds, context);
    const halfRange =
        typeof context.weaponProfile.range === "number"
            ? context.weaponProfile.range / 2
            : undefined;

    const expanded: TaggedMechanic[] = [];
    for (const tagged of activeAdds) {
        if (!tagged.mechanic.weaponAttributes) continue;
        for (const name of tagged.mechanic.weaponAttributes) {
            const parsed = parseParameterisedName(name);
            const template = weaponAttributeRegistry[parsed.key];
            if (!template) continue;

            // If the ability carries a value (e.g. "2" for Sustained Hits 2),
            // use it as the param for hydration
            if (parsed.param === undefined && tagged.mechanic.value != null) {
                parsed.param =
                    typeof tagged.mechanic.value === "number"
                        ? tagged.mechanic.value
                        : undefined;
            }

            const mechanic = hydrateMechanic(template, parsed, { halfRange });
            expanded.push({
                mechanic,
                layer: "weaponAttribute",
                perspective: tagged.perspective,
            });
        }
    }

    return [...rest, ...expanded];
};
