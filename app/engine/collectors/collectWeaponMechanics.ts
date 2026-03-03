import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";
import { parseParameterisedName } from "../utils/parseParameterisedName";
import { hydrateMechanic } from "../utils/hydrateMechanic";

import anti from "@/app/library/weapon-attributes/anti.json";
import assault from "@/app/library/weapon-attributes/assault.json";
import blast from "@/app/library/weapon-attributes/blast.json";
import devastatingWounds from "@/app/library/weapon-attributes/devastating-wounds.json";
import heavy from "@/app/library/weapon-attributes/heavy.json";
import ignoresCover from "@/app/library/weapon-attributes/ignores-cover.json";
import lance from "@/app/library/weapon-attributes/lance.json";
import lethalHits from "@/app/library/weapon-attributes/lethal-hits.json";
import melta from "@/app/library/weapon-attributes/melta.json";
import pistol from "@/app/library/weapon-attributes/pistol.json";
import rapidFire from "@/app/library/weapon-attributes/rapid-fire.json";
import sustainedHits from "@/app/library/weapon-attributes/sustained-hits.json";
import torrent from "@/app/library/weapon-attributes/torrent.json";
import twinLinked from "@/app/library/weapon-attributes/twin-linked.json";

const weaponAttributeRegistry: Record<string, Mechanic> = {
    anti: anti as unknown as Mechanic,
    assault: assault as unknown as Mechanic,
    blast: blast as unknown as Mechanic,
    "devastating-wounds": devastatingWounds as unknown as Mechanic,
    heavy: heavy as unknown as Mechanic,
    "ignores-cover": ignoresCover as unknown as Mechanic,
    lance: lance as unknown as Mechanic,
    "lethal-hits": lethalHits as unknown as Mechanic,
    melta: melta as unknown as Mechanic,
    pistol: pistol as unknown as Mechanic,
    "rapid-fire": rapidFire as unknown as Mechanic,
    "sustained-hits": sustainedHits as unknown as Mechanic,
    torrent: torrent as unknown as Mechanic,
    "twin-linked": twinLinked as unknown as Mechanic,
};

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
