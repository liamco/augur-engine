import { strengthVsToughness } from "@/app/engine/combat-logic/compareStrengthAndToughness";

import { TestUnit } from "../../../types/Test";

import attackingUnitData from "../../../data/output/heavy-intercessor-squad.json";
import defendingUnitData from "../../../data/output/winged-tyranid-prime.json";

import checkUnitAbilities from "@/app/engine/utils/checkForUnitAbility";
import calculateAttackCount from "@/app/engine/combat-logic/resolveAttackCount";
import resolveHitRoll from "@/app/engine/combat-logic/resolveHitRoll";
import resolveWoundRoll from "@/app/engine/combat-logic/resolveWoundRoll";

const Octagon = () => {
    const attackingUnit = attackingUnitData as TestUnit;
    const defendingUnit = defendingUnitData as TestUnit;

    const selectedAttackingWeapon =
        attackingUnit.wargear.weapons[1].profiles[0];

    const attackCount = calculateAttackCount(
        attackingUnit,
        selectedAttackingWeapon,
    );

    const toHit = resolveHitRoll(
        attackingUnit,
        selectedAttackingWeapon,
        defendingUnit,
    );

    const toWound = resolveWoundRoll(
        attackingUnit,
        selectedAttackingWeapon,
        defendingUnit,
    );

    const toSave = defendingUnit.models[0].sv - selectedAttackingWeapon.ap;
    const feelNoPain = checkUnitAbilities(defendingUnit, "Feel No Pain");

    return (
        <main className="grid grid-cols-2 w-full max-w-150 h-full gap-4 text-center">
            <h1 className="col-span-2">Results</h1>
            <strong>Attacks</strong>
            <span>{attackCount}</span>
            <strong>To hit</strong>
            <span>{toHit}</span>
            <strong>To wound</strong>
            <span>{toWound}</span>
            <strong>To save</strong>
            <span>{toSave}</span>
            <strong>Feel no pain</strong>
            <span>{feelNoPain ? feelNoPain.parameter : "-"}</span>
        </main>
    );
};

export default Octagon;
