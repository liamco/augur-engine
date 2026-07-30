import { EngagementPhase } from "@/app/types/Engagement";
import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext, StratagemActivation } from "@/app/types/CombatContext";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import { createDefaultCombatState } from "../utils/createDefaultCombatState";

// combatState is runtime-only (not in the codex). Seed a default for any unit
// entering resolution, letting an explicit combatState on the unit override it.
const withCombatState = (unit: TestUnit): TestUnit => ({
    ...unit,
    combatState: {
        ...createDefaultCombatState(unit),
        ...(unit.combatState ?? {}),
    },
});

interface BuildCombatContextParams {
    attacker: TestUnit;
    defender: TestUnit;
    weaponProfile: WeaponProfile;
    activeStratagems?: StratagemActivation[];
    attackerDetachmentMechanics?: Mechanic[];
    defenderDetachmentMechanics?: Mechanic[];
    attackerArmyMechanics?: Mechanic[];
    defenderArmyMechanics?: Mechanic[];
    engagementPhase?: EngagementPhase;
    rangeToTarget?: number;
}

export const buildCombatContext = (
    params: BuildCombatContextParams,
): CombatContext => {
    return {
        attacker: withCombatState(params.attacker),
        defender: withCombatState(params.defender),
        weaponProfile: params.weaponProfile,
        activeStratagems: params.activeStratagems ?? [],
        attackerDetachmentMechanics: params.attackerDetachmentMechanics ?? [],
        defenderDetachmentMechanics: params.defenderDetachmentMechanics ?? [],
        attackerArmyMechanics: params.attackerArmyMechanics ?? [],
        defenderArmyMechanics: params.defenderArmyMechanics ?? [],
        engagementPhase: params.engagementPhase,
        rangeToTarget: params.rangeToTarget,
    };
};
