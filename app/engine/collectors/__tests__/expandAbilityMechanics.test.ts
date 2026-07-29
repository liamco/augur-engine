import { describe, it, expect } from "vitest";
import { expandAbilityMechanics } from "../expandAbilityMechanics";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "../collectAllMechanics";

const context = {
    attacker: { combatState: {} },
    defender: { combatState: {} },
    weaponProfile: {},
} as unknown as CombatContext;

const grant = (
    abilities: string[],
    value: boolean | number,
): TaggedMechanic =>
    ({
        mechanic: {
            name: "Granting ability",
            entity: "thisUnit",
            effect: "addsAbility",
            abilities,
            value,
        },
        layer: "unitAbility",
        perspective: "defender",
    }) as unknown as TaggedMechanic;

describe("expandAbilityMechanics", () => {
    it("expands a granted ability and propagates the granting value as its param", () => {
        // addsAbility ["FEEL NO PAIN"] value 4 -> a setsFnp mechanic with value 4
        const out = expandAbilityMechanics([grant(["FEEL NO PAIN"], 4)], context);
        const fnp = out.find((t) => t.mechanic.effect === "setsFnp");
        expect(fnp).toBeDefined();
        expect(fnp!.mechanic.value).toBe(4);
    });

    it("expands a boolean grant without forcing a param", () => {
        // STEALTH is granted with value true; its template value stays as-is (1)
        const out = expandAbilityMechanics([grant(["STEALTH"], true)], context);
        const stealth = out.find((t) => t.mechanic.name === "Stealth");
        expect(stealth).toBeDefined();
        expect(stealth!.mechanic.value).toBe(1);
    });
});
