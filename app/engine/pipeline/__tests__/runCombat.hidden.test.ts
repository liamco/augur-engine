import { describe, it, expect } from "vitest";
import { buildCombatContext } from "../buildCombatContext";
import { runCombat } from "../runCombat";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import heavyIntercessors from "@/app/codex/heavy-intercessor-squad.json";
import infernusSquad from "@/app/codex/infernus-squad.json";

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

// Infernus carries the INFANTRY keyword natively.
const defender = (opts: {
    isHidden?: boolean;
    isInCover?: boolean;
    keywords?: { keyword: string }[];
}): TestUnit => {
    const base = infernusSquad as unknown as TestUnit;
    return {
        ...base,
        keywords: opts.keywords ?? base.keywords,
        combatState: {
            ...base.combatState,
            // opts.isHidden = "unit is hidden" (test intent) → has NOT shot.
            hasShot: !(opts.isHidden ?? false),
            isInCover: opts.isInCover ?? false,
        },
    } as unknown as TestUnit;
};

const shoot = (d: TestUnit, rangeToTarget?: number) =>
    runCombat(
        buildCombatContext({
            attacker,
            defender: d,
            weaponProfile: heavyBoltRifle,
            engagementPhase: "shooting",
            rangeToTarget,
        }),
    );

describe("runCombat — Hidden targeting eligibility", () => {
    it("is INELIGIBLE when hidden + in cover + INFANTRY and beyond 15in", () => {
        const r = shoot(defender({ isHidden: true, isInCover: true }), 20);
        expect(r.eligibility.eligible).toBe(false);
        expect(r.eligibility.reason).toBe("Hidden");
    });

    it("is eligible within 15in", () => {
        expect(
            shoot(defender({ isHidden: true, isInCover: true }), 10).eligibility
                .eligible,
        ).toBe(true);
    });

    it("is eligible when not hidden (in cover + keyword, but shot)", () => {
        expect(
            shoot(defender({ isHidden: false, isInCover: true }), 20).eligibility
                .eligible,
        ).toBe(true);
    });

    it("is eligible when not in cover", () => {
        expect(
            shoot(defender({ isHidden: true, isInCover: false }), 20).eligibility
                .eligible,
        ).toBe(true);
    });

    it("is eligible when the unit lacks a qualifying keyword", () => {
        const noKw = defender({
            isHidden: true,
            isInCover: true,
            keywords: [{ keyword: "VEHICLE" }] as { keyword: string }[],
        });
        expect(shoot(noKw, 20).eligibility.eligible).toBe(true);
    });

    it("still computes the attack phases when ineligible", () => {
        const r = shoot(defender({ isHidden: true, isInCover: true }), 20);
        expect(r.hitPhase.targetRoll).toBeTypeOf("number");
    });
});
