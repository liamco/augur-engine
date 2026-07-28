import { describe, it, expect } from "vitest";
import { weaponAttributeRegistry } from "@/app/library/weapon-attributes";
import { unitAbilityRegistry } from "@/app/library/unit-abilities";

const VALID_EFFECTS = new Set([
    "addsAbility",
    "addsBehaviour",
    "addsKeyword",
    "addsWeaponAttribute",
    "autoSuccess",
    "criticalWound",
    "extraSuccess",
    "forceRoll",
    "halveDamage",
    "ignoreBehaviour",
    "ignoreModifier",
    "ignoreState",
    "minDamage",
    "mortalWounds",
    "rollBonus",
    "rollPenalty",
    "reroll",
    "rollBlock",
    "setsFnp",
    "staticNumber",
]);

const indexes = { weaponAttributeRegistry, unitAbilityRegistry };

describe("library folder indexes", () => {
    for (const [name, index] of Object.entries(indexes)) {
        describe(name, () => {
            for (const [key, mechanic] of Object.entries(index)) {
                it(`"${key}" points at a valid, non-empty mechanic`, () => {
                    expect(mechanic).toBeTypeOf("object");
                    expect(Object.keys(mechanic).length).toBeGreaterThan(0);
                    expect(VALID_EFFECTS.has(mechanic.effect)).toBe(true);
                    expect(mechanic.value).toBeDefined();
                    expect(typeof mechanic.entity).toBe("string");
                });
            }
        });
    }
});
