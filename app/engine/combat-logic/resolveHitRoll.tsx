import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import collectWeaponAbilitiesByAttribute from "../collectors/collectWeaponAbilitiesByAttribute";
import collectUnitAbilitiesByAttribute from "../collectors/collectUnitAbilitiesByAttribute";

const resolveHitRoll = (
    attackingUnit: TestUnit,
    selectedWeaponProfile: WeaponProfile,
    defendingUnit: TestUnit,
) => {
    const baseHitRoll = selectedWeaponProfile.bsWs;

    // check selected weapon profile for any attributes which affect hit rolls e.g. HEAVY, TORRENT
    const attackingWeaponAttributes = collectWeaponAbilitiesByAttribute(
        selectedWeaponProfile,
        "hit",
    );

    // check attacking unit for any abilities which affect hit rolls e.g. "+1 to hit against a target which is battle-shocked"
    const attackingUnitAbilities = collectUnitAbilitiesByAttribute(
        attackingUnit,
        "hit",
    );

    // check defender for any abilities which affect hit rolls e.g. STEALTH, LONE OPERATIVE
    const defendingUnitAbilities = collectUnitAbilitiesByAttribute(
        defendingUnit,
        "hit",
    );

    const stuff = [
        {
            // heavy + 1
            // captain + 1 hit
            // stealth -1
        },
    ];

    console.log(attackingWeaponAttributes);
    console.log(attackingUnitAbilities);
    console.log(defendingUnitAbilities);

    return baseHitRoll;

    // groups results by Effect e.g. rollBonus, rollPenalty, autoSuccess
    //
    // run through each effect type and work out which ones should take precedence;
    // - should only have a maximum of one thing affecting any one roll in a direction
    // autoSuccess takes priority
    // select one rollBonus
    // select one rollPenalty
    // - Should rollBonuses and rollPenaties be balanced e.g. if there are two penalties and one bonus, end roll is -1?
};

export default resolveHitRoll;
