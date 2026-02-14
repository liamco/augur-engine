import { TestUnit } from "@/app/types/Test";

const checkForUnitAbility = (unit: TestUnit, abilityName: string) => {
    return unit.abilities?.find((ability) => ability.name === abilityName);
};

export default checkForUnitAbility;
