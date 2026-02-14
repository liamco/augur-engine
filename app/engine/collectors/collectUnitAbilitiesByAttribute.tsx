import { TestUnit } from "@/app/types/Test";

const collectUnitAbilitiesByAttribute = (
    unit: TestUnit,
    attributeName: string,
) => {
    if (!unit.abilities) {
        return [];
    }
    const unitAbilities = unit.abilities?.filter((ability) => {
        if (!ability.mechanics) {
            return false;
        }
        return ability.mechanics.some(
            (mechanic) => mechanic.attribute === attributeName,
        );
    });

    return unitAbilities.flatMap((ability) => ability.mechanics);
};

export default collectUnitAbilitiesByAttribute;
