import { describe, it, expect } from "vitest";
import { buildCombatContext } from "../buildCombatContext";
import { runCombat } from "../runCombat";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import heavyIntercessors from "@/app/codex/factions/space-marines/datasheets/000001177.json";
import infernusSquad from "@/app/codex/factions/space-marines/datasheets/000000126.json";

// A Rapid Fire 1 weapon, range 24 → half range 12.
const rapidFireGun: WeaponProfile = {
    datasheetId: "x",
    line: 1,
    name: "Rapid gun",
    type: "Ranged",
    attributes: ["RAPID FIRE 1"],
    range: 24,
    a: 2,
    bsWs: 3,
    s: 4,
    ap: 0,
    d: 1,
};

const attacker = heavyIntercessors as unknown as TestUnit;
const defender = infernusSquad as unknown as TestUnit;

const shoot = (rangeToTarget?: number) =>
    runCombat(
        buildCombatContext({
            attacker,
            defender,
            weaponProfile: rapidFireGun,
            engagementPhase: "shooting",
            rangeToTarget,
        }),
    );

describe("runCombat — Rapid Fire (distanceToTarget vs half range)", () => {
    it("triggers within half range (12) — more attacks than out of range", () => {
        const near = shoot(12);
        const far = shoot(20);
        expect(near.attackCount.modifiedValue).toBeGreaterThan(
            far.attackCount.modifiedValue,
        );
    });

    it("does not trigger beyond half range (no bonus attacks)", () => {
        const far = shoot(20);
        expect(far.attackCount.modifiedValue).toBe(far.attackCount.baseValue);
    });

    it("does not trigger when range is unknown (blank field)", () => {
        const unknown = shoot(undefined);
        expect(unknown.attackCount.modifiedValue).toBe(
            unknown.attackCount.baseValue,
        );
    });
});
