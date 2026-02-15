import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";
import assault from "@/app/library/weapon-attributes/assault.json";
import blast from "@/app/library/weapon-attributes/blast.json";
import heavy from "@/app/library/weapon-attributes/heavy.json";
import ignoresCover from "@/app/library/weapon-attributes/ignores-cover.json";
import torrent from "@/app/library/weapon-attributes/torrent.json";

const weaponAttributeRegistry: Record<string, Mechanic> = {
    assault: assault as unknown as Mechanic,
    blast: blast as unknown as Mechanic,
    heavy: heavy as unknown as Mechanic,
    ignorescover: ignoresCover as unknown as Mechanic,
    torrent: torrent as unknown as Mechanic,
};

const sanitize = (str: string): string => {
    return str.replace(/\s+/g, "").toLowerCase();
};

export const collectWeaponMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];

    for (const attrName of context.weaponProfile.attributes) {
        const key = sanitize(attrName);
        const mechanic = weaponAttributeRegistry[key];
        if (mechanic) {
            results.push({
                mechanic,
                layer: "weaponAttribute",
                perspective: "attacker",
            });
        }
    }

    return results;
};
