import { TestUnit } from "@/app/types/Test";

const checkUnitSurvivorCount = (unit: TestUnit) => {
    return unit.combatState.modelCount - unit.combatState.deadModelIds.length;
};

export default checkUnitSurvivorCount;
