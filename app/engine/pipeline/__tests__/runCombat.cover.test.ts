import { describe, it, expect } from "vitest";
import { buildCombatContext } from "../buildCombatContext";
import { runCombat } from "../runCombat";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import heavyIntercessors from "@/app/codex/heavy-intercessor-squad.json";
import infernusSquad from "@/app/codex/infernus-squad.json";

// The exact test-lab scenario: Heavy Intercessors (heavy bolt rifle, BS 3+, AP -1)
// shooting an Infernus Squad (Sv 3+). New-edition cover applies a -1 BS penalty to
// the attacker, so the hit roll worsens from 3+ to 4+ while the save is untouched.
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

// Strip any innate STEALTH from the fixture so this test measures cover in
// isolation (the manifest Infernus carries STEALTH for the lab demo, which
// would otherwise apply its own -1 BS).
const plainInfernus = {
    ...(infernusSquad as unknown as TestUnit),
    abilities: ((infernusSquad as unknown as TestUnit).abilities ?? []).filter(
        (a) => a.name !== "STEALTH",
    ),
} as unknown as TestUnit;

const infernusWithCover = (isInCover: boolean): TestUnit =>
    ({
        ...plainInfernus,
        combatState: {
            ...plainInfernus.combatState,
            isInCover,
        },
    }) as TestUnit;

const shoot = (isInCover: boolean) =>
    runCombat(
        buildCombatContext({
            attacker,
            defender: infernusWithCover(isInCover),
            weaponProfile: heavyBoltRifle,
            engagementPhase: "shooting",
        }),
    );

describe("runCombat — Benefit of Cover (new edition)", () => {
    it("worsens the attacker's hit roll by 1 when the target is in cover", () => {
        const noCover = shoot(false);
        const inCover = shoot(true);

        // The heavy bolt rifle is HEAVY and the unit is stationary (default
        // "hold"), so it already hits on 2+ (BS 3+ improved by HEAVY's +1).
        // Cover's -1 BS penalty worsens that by exactly 1 (2+ -> 3+),
        // stacking with the HEAVY bonus.
        expect(noCover.hitPhase.targetRoll).toBe(2);
        expect(inCover.hitPhase.targetRoll).toBe(3);
    });

    it("does not change the defender's save when in cover", () => {
        const noCover = shoot(false);
        const inCover = shoot(true);

        // Sv 3+ degraded to 4+ by AP -1; cover no longer touches the save.
        expect(noCover.savePhase.targetRoll).toBe(4);
        expect(inCover.savePhase.targetRoll).toBe(
            noCover.savePhase.targetRoll,
        );
    });
});
