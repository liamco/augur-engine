import { Mechanic } from "@/app/types/Mechanic";
import { parseParameterisedName } from "./parseParameterisedName";

import assault from "@/app/library/weapon-attributes/assault.json";

const weaponBehaviourRegistry: Record<string, string[]> = {};

// Build registry of weapon attribute key -> behaviour names
const behaviourAttributes: { key: string; mechanic: Mechanic }[] = [
    { key: "assault", mechanic: assault as unknown as Mechanic },
];

for (const { key, mechanic } of behaviourAttributes) {
    if (mechanic.effect === "addsBehaviour" && mechanic.behaviours) {
        weaponBehaviourRegistry[key] = mechanic.behaviours;
    }
}

export const collectWeaponBehaviours = (
    weaponAttributes: string[],
    unitMechanics: Mechanic[],
): string[] => {
    const behaviours = new Set<string>();

    // Weapon-attribute-level behaviours
    for (const attr of weaponAttributes) {
        const parsed = parseParameterisedName(attr);
        const names = weaponBehaviourRegistry[parsed.key];
        if (names) {
            for (const name of names) behaviours.add(name);
        }
    }

    // Unit-level behaviours from ability mechanics
    for (const mechanic of unitMechanics) {
        if (mechanic.effect === "addsBehaviour" && mechanic.behaviours) {
            for (const name of mechanic.behaviours) behaviours.add(name);
        }
    }

    return [...behaviours];
};
