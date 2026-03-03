import { describe, it, expect } from "vitest";
import { expandWeaponAttributeMechanics } from "../expandWeaponAttributeMechanics";
import { TaggedMechanic } from "../collectAllMechanics";
import { CombatContext } from "@/app/types/CombatContext";
import { WeaponProfile } from "@/app/types/Weapon";

const makeContext = (range: number | string = 24): CombatContext =>
    ({
        weaponProfile: { range, attributes: [] } as unknown as WeaponProfile,
        attacker: { combatState: {} },
        defender: { combatState: {} },
    }) as unknown as CombatContext;

const makeAddsWeaponAttr = (
    weaponAttributes: string[],
    value: number | boolean | string = true,
): TaggedMechanic => ({
    mechanic: {
        name: "test-ability",
        entity: "thisModel",
        effect: "addsWeaponAttribute",
        value,
        weaponAttributes,
    },
    layer: "unitAbility",
    perspective: "attacker",
});

describe("expandWeaponAttributeMechanics", () => {
    it("expands SUSTAINED HITS with param from ability value", () => {
        const input = [makeAddsWeaponAttr(["SUSTAINED HITS"], 2)];
        const result = expandWeaponAttributeMechanics(input, makeContext());

        expect(result).toHaveLength(1);
        const m = result[0].mechanic;
        expect(m.effect).toBe("extraSuccess");
        expect(m.value).toBe(2);
        expect(m.conditions![0].value).toBe(6); // $critical → 6
    });

    it("expands LETHAL HITS (no param needed)", () => {
        const input = [makeAddsWeaponAttr(["LETHAL HITS"])];
        const result = expandWeaponAttributeMechanics(input, makeContext());

        expect(result).toHaveLength(1);
        expect(result[0].mechanic.effect).toBe("autoSuccess");
        expect(result[0].mechanic.attribute).toBe("wound");
    });

    it("expands DEVASTATING WOUNDS (no param needed)", () => {
        const input = [makeAddsWeaponAttr(["DEVASTATING WOUNDS"])];
        const result = expandWeaponAttributeMechanics(input, makeContext());

        expect(result).toHaveLength(1);
        expect(result[0].mechanic.effect).toBe("mortalWounds");
    });

    it("passes through non-addsWeaponAttribute mechanics unchanged", () => {
        const passthrough: TaggedMechanic = {
            mechanic: {
                name: "stealth",
                entity: "opposingUnit",
                effect: "rollPenalty",
                attribute: "hit",
                value: 1,
            },
            layer: "unitAbility",
            perspective: "defender",
        };
        const result = expandWeaponAttributeMechanics(
            [passthrough],
            makeContext(),
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(passthrough);
    });

    it("preserves perspective from the source mechanic", () => {
        const input: TaggedMechanic[] = [
            {
                ...makeAddsWeaponAttr(["LETHAL HITS"]),
                perspective: "defender",
            },
        ];
        const result = expandWeaponAttributeMechanics(input, makeContext());
        expect(result[0].perspective).toBe("defender");
    });
});
