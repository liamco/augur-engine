import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";

export const strengthVsToughness = (s: number, t: number) => {
    if (s > t * 2) {
        return 2;
    }

    if (s > t) {
        return 3;
    }

    if (s === t) {
        return 4;
    }

    if (t > s) {
        return 5;
    }

    if (s * 2 < t) {
        return 6;
    }
};

const resolveWoundRoll = (
    attackingUnit: TestUnit,
    selectedWeaponProfile: WeaponProfile,
    defendingUnit: TestUnit,
) => {
    const baseWoundRoll = strengthVsToughness(
        selectedWeaponProfile.s,
        defendingUnit.models[0].t,
    );

    return baseWoundRoll;
};

export default resolveWoundRoll;
