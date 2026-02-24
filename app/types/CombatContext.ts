import { EngagementPhase } from "./Engagement";
import { Mechanic } from "./Mechanic";
import { TestUnit } from "./Test";
import { WeaponProfile } from "./Weapon";

export interface StratagemActivation {
    name: string;
    player: "attacker" | "defender";
    mechanics: Mechanic[];
}

export interface CombatContext {
    attacker: TestUnit;
    defender: TestUnit;
    weaponProfile: WeaponProfile;
    activeStratagems: StratagemActivation[];
    attackerDetachmentMechanics: Mechanic[];
    defenderDetachmentMechanics: Mechanic[];
    attackerArmyMechanics: Mechanic[];
    defenderArmyMechanics: Mechanic[];
    engagementPhase?: EngagementPhase;
}
