import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";
import { parseParameterisedName } from "../utils/parseParameterisedName";
import { hydrateMechanic } from "../utils/hydrateMechanic";
import { weaponAttributeRegistry } from "@/app/library/weapon-attributes";

export const collectWeaponMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];
    const halfRange =
        typeof context.weaponProfile.range === "number"
            ? context.weaponProfile.range / 2
            : undefined;

    for (const attrName of context.weaponProfile.attributes) {
        const parsed = parseParameterisedName(attrName);
        const template = weaponAttributeRegistry[parsed.key];
        if (!template) continue;

        const mechanic = hydrateMechanic(template, parsed, { halfRange });
        results.push({
            mechanic,
            layer: "weaponAttribute",
            perspective: "attacker",
        });
    }

    return results;
};
