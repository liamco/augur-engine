import { Mechanic } from "@/app/types/Mechanic";

import anti from "./anti.json";
import assault from "./assault.json";
import blast from "./blast.json";
import devastatingWounds from "./devastating-wounds.json";
import heavy from "./heavy.json";
import ignoresCover from "./ignores-cover.json";
import lance from "./lance.json";
import lethalHits from "./lethal-hits.json";
import melta from "./melta.json";
import pistol from "./pistol.json";
import rapidFire from "./rapid-fire.json";
import sustainedHits from "./sustained-hits.json";
import torrent from "./torrent.json";
import twinLinked from "./twin-linked.json";

/**
 * Active weapon-attribute allowlist. To activate a finished weapon-attribute
 * rule, add ONE import above and ONE line here — no engine change required.
 * (precision.json is intentionally omitted: it is an unfinished stub.)
 */
export const weaponAttributeRegistry: Record<string, Mechanic> = {
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
