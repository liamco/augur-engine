import { Entity } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { CombatState } from "@/app/types/State";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";

export interface EntityData {
    unit: TestUnit;
    combatState: CombatState;
    weaponProfile?: WeaponProfile;
}

export const resolveEntity = (
    entity: Entity,
    context: CombatContext,
    perspective: "attacker" | "defender",
): EntityData => {
    switch (entity) {
        case "thisUnit":
        case "thisModel":
            return perspective === "attacker"
                ? {
                      unit: context.attacker,
                      combatState: context.attacker.combatState,
                      weaponProfile: context.weaponProfile,
                  }
                : {
                      unit: context.defender,
                      combatState: context.defender.combatState,
                  };

        case "opposingUnit":
        case "opposingModel":
            return perspective === "attacker"
                ? {
                      unit: context.defender,
                      combatState: context.defender.combatState,
                  }
                : {
                      unit: context.attacker,
                      combatState: context.attacker.combatState,
                      weaponProfile: context.weaponProfile,
                  };

        case "targetUnit":
        case "targetModel":
            return {
                unit: context.defender,
                combatState: context.defender.combatState,
            };

        case "thisArmy":
            return perspective === "attacker"
                ? {
                      unit: context.attacker,
                      combatState: context.attacker.combatState,
                  }
                : {
                      unit: context.defender,
                      combatState: context.defender.combatState,
                  };

        case "opponentArmy":
            return perspective === "attacker"
                ? {
                      unit: context.defender,
                      combatState: context.defender.combatState,
                  }
                : {
                      unit: context.attacker,
                      combatState: context.attacker.combatState,
                  };
    }
};
