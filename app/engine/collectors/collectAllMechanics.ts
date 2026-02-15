import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { MechanicLayer } from "@/app/types/ResolvedModifiers";
import { collectWeaponMechanics } from "./collectWeaponMechanics";
import { collectUnitMechanics } from "./collectUnitMechanics";
import { collectLeaderMechanics } from "./collectLeaderMechanics";
import { collectEnhancementMechanics } from "./collectEnhancementMechanics";
import { collectWargearMechanics } from "./collectWargearMechanics";
import { collectDamagedMechanics } from "./collectDamagedMechanics";
import { collectStratagemMechanics } from "./collectStratagemMechanics";
import { collectDetachmentMechanics } from "./collectDetachmentMechanics";
import { collectArmyMechanics } from "./collectArmyMechanics";

export interface TaggedMechanic {
    mechanic: Mechanic;
    layer: MechanicLayer;
    perspective: "attacker" | "defender";
}

export const collectAllMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    return [
        ...collectWeaponMechanics(context),
        ...collectUnitMechanics(context),
        ...collectLeaderMechanics(context),
        ...collectEnhancementMechanics(context),
        ...collectWargearMechanics(context),
        ...collectDamagedMechanics(context),
        ...collectStratagemMechanics(context),
        ...collectDetachmentMechanics(context),
        ...collectArmyMechanics(context),
    ];
};
