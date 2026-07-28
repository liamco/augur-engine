import { describe, it, expect } from "vitest";
import { filterByTarget } from "../targetResolver";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "../../collectors/collectAllMechanics";

const context = {
    attacker: { combatState: {} },
    defender: { combatState: {} },
    weaponProfile: {},
} as unknown as CombatContext;

const tag = (
    entity: string,
    perspective: "attacker" | "defender",
    attribute?: string,
    effect = "rollPenalty",
): TaggedMechanic =>
    ({
        mechanic: { name: "m", entity, effect, attribute, value: 1 },
        layer: "unitAbility",
        perspective,
    }) as unknown as TaggedMechanic;

describe("filterByTarget", () => {
    it("keeps a ballisticSkill modifier whose target is the attacker", () => {
        // opposingUnit from the defender's perspective resolves to the attacker
        const kept = filterByTarget(
            [tag("opposingUnit", "defender", "ballisticSkill")],
            context,
        );
        expect(kept).toHaveLength(1);
    });

    it("drops a ballisticSkill modifier whose target is the defender", () => {
        // thisUnit from the defender's perspective resolves to the defender (wrong side for BS)
        const kept = filterByTarget(
            [tag("thisUnit", "defender", "ballisticSkill")],
            context,
        );
        expect(kept).toHaveLength(0);
    });

    it("keeps a save modifier whose target is the defender", () => {
        // opposingUnit from the attacker's perspective resolves to the defender
        const kept = filterByTarget(
            [tag("opposingUnit", "attacker", "save")],
            context,
        );
        expect(kept).toHaveLength(1);
    });

    it("passes through mechanics with no attribute", () => {
        const kept = filterByTarget(
            [tag("targetUnit", "attacker", undefined, "forceRoll")],
            context,
        );
        expect(kept).toHaveLength(1);
    });

    it("passes through attributes with no known owning side", () => {
        const kept = filterByTarget(
            [tag("thisUnit", "attacker", "movement")],
            context,
        );
        expect(kept).toHaveLength(1);
    });
});
