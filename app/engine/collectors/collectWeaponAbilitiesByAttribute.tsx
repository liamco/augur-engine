import { WeaponProfile } from "@/app/types/Weapon";
import { Mechanic } from "@/app/types/Mechanic";
import assault from "@/app/library/weapon-attributes/assault.json";
import blast from "@/app/library/weapon-attributes/blast.json";
import heavy from "@/app/library/weapon-attributes/heavy.json";
import ignoresCover from "@/app/library/weapon-attributes/ignores-cover.json";
import torrent from "@/app/library/weapon-attributes/torrent.json";

const weaponAttributeMap: Record<string, Mechanic> = {
    assault: assault as unknown as Mechanic,
    blast: blast as unknown as Mechanic,
    heavy: heavy as unknown as Mechanic,
    ignorescover: ignoresCover as unknown as Mechanic,
    torrent: torrent as unknown as Mechanic,
};

const sanitizeAttributeName = (str: string) => {
    return str.replace(" ", "").toLowerCase();
};

const collectWeaponAbilitiesByAttribute = (
    weaponProfile: WeaponProfile,
    attributeName: string,
) => {
    return weaponProfile.attributes
        .map(
            (attribute) => weaponAttributeMap[sanitizeAttributeName(attribute)],
        )
        .filter((mechanic) => mechanic?.attribute === attributeName);
};

export default collectWeaponAbilitiesByAttribute;
