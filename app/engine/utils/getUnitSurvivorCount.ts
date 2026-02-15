import { TestUnit } from "@/app/types/Test";

export const getUnitSurvivorCount = (unit: TestUnit): number => {
    return unit.combatState.modelCount - unit.combatState.deadModelIds.length;
};
