import { TestUnit } from "../../types/Test";
import { WeaponProfile } from "../../types/Weapon";
import checkUnitSurvivorCount from "../utils/checkUnitSurvivorCount";

const calculateAttackCount = (
    unit: TestUnit,
    selectedWeaponProfile: WeaponProfile,
) => {
    if (typeof selectedWeaponProfile.a === "number") {
        return checkUnitSurvivorCount(unit) * selectedWeaponProfile.a;
    }
    // TODO: needs to properly account for D values
    return checkUnitSurvivorCount(unit) * parseInt(selectedWeaponProfile.a);
};

export default calculateAttackCount;
