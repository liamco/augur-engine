import { Attribute } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "../collectors/collectAllMechanics";
import { resolveEntity } from "./entityResolver";

type Side = "attacker" | "defender";

/**
 * The unit whose characteristic/roll each combat attribute belongs to during
 * resolution. A stat-modifier only applies if its declared target is this side.
 * Attributes not listed here (movement, wounds, behaviours, etc.) are not
 * direction-filtered.
 */
const ATTRIBUTE_SIDE: Partial<Record<Attribute, Side>> = {
    hit: "attacker",
    wound: "attacker",
    ballisticSkill: "attacker",
    weaponSkill: "attacker",
    strength: "attacker",
    armourPenetration: "attacker",
    damage: "attacker",
    attacks: "attacker",
    save: "defender",
    toughness: "defender",
    invulnSave: "defender",
    feelNoPain: "defender",
};

export const filterByTarget = (
    mechanics: TaggedMechanic[],
    context: CombatContext,
): TaggedMechanic[] =>
    mechanics.filter(({ mechanic, perspective }) => {
        const attr = mechanic.attribute;
        if (!attr) return true;

        const owningSide = ATTRIBUTE_SIDE[attr];
        if (!owningSide) return true; // not a directional combat attribute

        const targetUnit = resolveEntity(
            mechanic.entity,
            context,
            perspective,
        ).unit;
        const targetSide: Side =
            targetUnit === context.defender ? "defender" : "attacker";

        return targetSide === owningSide;
    });
