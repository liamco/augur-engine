import { EngagementPhase } from "@/app/types/Engagement";
import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext, StratagemActivation } from "@/app/types/CombatContext";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";

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
}

export const buildCombatContext = (
    params: BuildCombatContextParams,
): CombatContext => {
    return {
        attacker: params.attacker,
        defender: params.defender,
        weaponProfile: params.weaponProfile,
        activeStratagems: params.activeStratagems ?? [],
        attackerDetachmentMechanics: params.attackerDetachmentMechanics ?? [],
        defenderDetachmentMechanics: params.defenderDetachmentMechanics ?? [],
        attackerArmyMechanics: params.attackerArmyMechanics ?? [],
        defenderArmyMechanics: params.defenderArmyMechanics ?? [],
        engagementPhase: params.engagementPhase,
    };
};
