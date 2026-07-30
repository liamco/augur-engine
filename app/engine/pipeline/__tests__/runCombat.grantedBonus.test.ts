import { describe, it, expect } from "vitest";
import { buildCombatContext } from "../buildCombatContext";
import { runCombat } from "../runCombat";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import heavyIntercessors from "@/app/codex/factions/space-marines/datasheets/000001177.json";
import infernusSquad from "@/app/codex/factions/space-marines/datasheets/000000126.json";

const heavyBoltRifle: WeaponProfile = {
    datasheetId: "000001177",
    line: 2,
    name: "Heavy bolt rifle",
    type: "Ranged",
    attributes: [],
    range: 30,
    a: 2,
    bsWs: 3,
    s: 5,
    ap: -1,
    d: 2,
};

const attacker = heavyIntercessors as unknown as TestUnit;

// A defender granted "FEEL NO PAIN 4+" via an addsAbility mechanic — the same
// expansion path a leader's conferred ability flows through.
const defenderGrantedFnp = {
    ...(infernusSquad as unknown as TestUnit),
    abilities: [
        {
            name: "Conferred FNP",
            type: "Datasheet",
            mechanics: [
                {
                    entity: "thisModel",
                    effect: "addsAbility",
                    abilities: ["FEEL NO PAIN"],
                    value: 4,
                },
            ],
        },
    ],
} as unknown as TestUnit;

const shoot = (defender: TestUnit) =>
    runCombat(
        buildCombatContext({
            attacker,
            defender,
            weaponProfile: heavyBoltRifle,
            engagementPhase: "shooting",
        }),
    );

describe("runCombat — granted (leader-style) bonus conferral", () => {
    it("a granted FEEL NO PAIN reaches the FNP phase with its value", () => {
        const result = shoot(defenderGrantedFnp);
        expect(result.feelNoPain).not.toBeNull();
        expect(result.feelNoPain!.targetRoll).toBe(4);
    });

    it("no FNP phase when nothing grants it", () => {
        const plain = {
            ...(infernusSquad as unknown as TestUnit),
            abilities: [],
        } as unknown as TestUnit;
        expect(shoot(plain).feelNoPain).toBeNull();
    });
});
