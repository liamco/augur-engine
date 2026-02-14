import { WeaponProfile } from "@/app/types/Weapon";

const checkWeaponAttributes = (profile: WeaponProfile, attrName: string) => {
    return profile.attributes?.find((attr) => attr === attrName);
};

export default checkWeaponAttributes;
