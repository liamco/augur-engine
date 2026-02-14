import { TestUnit } from "@/app/types/Test";

const checkUnitCasualtyCount = (unit: TestUnit) => {
    return unit.combatState.deadModelIds.length;
};

export default checkUnitCasualtyCount;
