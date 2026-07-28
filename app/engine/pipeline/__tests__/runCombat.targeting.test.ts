import { describe, it, expect } from "vitest";
import { buildCombatContext } from "../buildCombatContext";
import { runCombat } from "../runCombat";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import heavyIntercessors from "@/app/data/output/heavy-intercessor-squad.json";
import infernusSquad from "@/app/data/output/infernus-squad.json";

const heavyBoltRifle: WeaponProfile = {
    datasheetId: "000001177",
    line: 2,
    name: "Heavy bolt rifle",
    type: "Ranged",
    attributes: ["ASSAULT", "HEAVY"],
    range: 30,
    a: 2,
    bsWs: 3,
    s: 5,
    ap: -1,
    d: 2,
};

const attacker = heavyIntercessors as unknown as TestUnit;

// A defender ability carrying a ballisticSkill penalty aimed at `entity`.
// ballisticSkill belongs to the attacker, so a defender-targeted one must drop.
const misdirected = (entity: string): TestUnit =>
    ({
        ...(infernusSquad as unknown as TestUnit),
        abilities: [
            {
                name: "Test",
                type: "Datasheet",
                mechanics: [
                    {
                        name: "Test",
                        entity,
                        effect: "rollPenalty",
                        attribute: "ballisticSkill",
                        value: 1,
                        phase: ["shooting"],
                    },
                ],
            },
        ],
    }) as unknown as TestUnit;

const shoot = (defender: TestUnit) =>
    runCombat(
        buildCombatContext({
            attacker,
            defender,
            weaponProfile: heavyBoltRifle,
            engagementPhase: "shooting",
        }),
    );

describe("runCombat — target-aware filtering", () => {
    it("drops a defender-targeted ballisticSkill penalty (attacker's hit untouched)", () => {
        // thisUnit on the defender resolves to the defender → wrong side → dropped
        expect(shoot(misdirected("thisUnit")).hitPhase.targetRoll).toBe(2);
    });

    it("keeps an attacker-targeted ballisticSkill penalty", () => {
        // opposingUnit on the defender resolves to the attacker → kept
        expect(shoot(misdirected("opposingUnit")).hitPhase.targetRoll).toBe(3);
    });
});
