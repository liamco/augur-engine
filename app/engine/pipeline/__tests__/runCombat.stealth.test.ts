import { describe, it, expect } from "vitest";
import { buildCombatContext } from "../buildCombatContext";
import { runCombat } from "../runCombat";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import heavyIntercessors from "@/app/codex/heavy-intercessor-squad.json";
import infernusSquad from "@/app/codex/infernus-squad.json";
import stealthAbility from "@/app/library/unit-abilities/stealth.json";

// New-edition Stealth aliases Benefit of Cover: a -1 Ballistic Skill penalty to
// the shooter. Attacker = Heavy Intercessors (heavy bolt rifle, BS 3+, AP -1);
// HEAVY + stationary means the base hit is already 2+.
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

// Strip any innate STEALTH from the fixture so this test controls its own
// baseline (the manifest Infernus carries STEALTH for the lab demo).
const baseInfernus = {
    ...(infernusSquad as unknown as TestUnit),
    abilities: ((infernusSquad as unknown as TestUnit).abilities ?? []).filter(
        (a) => a.name !== "STEALTH",
    ),
} as unknown as TestUnit;

// A defender carrying Stealth innately (a datasheet ability whose mechanic is the
// library stealth definition) — the "innate on datasheet" collection path.
const stealthAbilityObj = {
    name: "STEALTH",
    type: "Datasheet",
    mechanics: [stealthAbility],
};

const withInnateStealth = (unit: TestUnit): TestUnit =>
    ({
        ...unit,
        abilities: [...(unit.abilities ?? []), stealthAbilityObj],
    }) as unknown as TestUnit;

const withCover = (unit: TestUnit, isInCover: boolean): TestUnit =>
    ({
        ...unit,
        combatState: { ...unit.combatState, isInCover },
    }) as TestUnit;

// A defender granted Stealth dynamically via addsAbility (as an aura/stratagem does).
const withGrantedStealth = (unit: TestUnit): TestUnit =>
    ({
        ...unit,
        abilities: [
            ...(unit.abilities ?? []),
            {
                name: "Concealing Aura",
                type: "Datasheet",
                mechanics: [
                    {
                        entity: "thisUnit",
                        effect: "addsAbility",
                        abilities: ["STEALTH"],
                        value: true,
                    },
                ],
            },
        ],
    }) as unknown as TestUnit;

// An attacker whose weapon Ignores Cover (strips benefitOfCover-sourced mechanics).
const ignoresCoverAttacker = {
    ...(heavyIntercessors as unknown as TestUnit),
    abilities: [
        ...((heavyIntercessors as unknown as TestUnit).abilities ?? []),
        {
            name: "Ignores Cover",
            type: "Datasheet",
            mechanics: [
                {
                    entity: "opposingUnit",
                    effect: "ignoreState",
                    attribute: "benefitOfCover",
                    value: true,
                },
            ],
        },
    ],
} as unknown as TestUnit;

const shoot = (
    defender: TestUnit,
    attacker: TestUnit = heavyIntercessors as unknown as TestUnit,
) =>
    runCombat(
        buildCombatContext({
            attacker,
            defender,
            weaponProfile: heavyBoltRifle,
            engagementPhase: "shooting",
        }),
    );

describe("runCombat — Stealth (alias of Benefit of Cover)", () => {
    it("applies a -1 BS penalty to the shooter (2+ -> 3+), save untouched", () => {
        const plain = shoot(baseInfernus);
        const stealthy = shoot(withInnateStealth(baseInfernus));

        expect(plain.hitPhase.targetRoll).toBe(2);
        expect(stealthy.hitPhase.targetRoll).toBe(3);
        expect(stealthy.savePhase.targetRoll).toBe(plain.savePhase.targetRoll);
    });

    it("does not stack with Benefit of Cover (net -1, both sources shown)", () => {
        const both = shoot(withCover(withInnateStealth(baseInfernus), true));

        expect(both.hitPhase.targetRoll).toBe(3); // not 4+

        const bsSources =
            both.hitPhase.modifiers.get("ballisticSkill")?.sources ?? [];
        const names = bsSources.map((s) => s.mechanicName);
        expect(names).toContain("Stealth");
        expect(names).toContain("In cover");
    });

    it("is stripped by Ignores Cover on the innate path", () => {
        const stealthy = withInnateStealth(baseInfernus);
        const ignored = shoot(stealthy, ignoresCoverAttacker);
        expect(ignored.hitPhase.targetRoll).toBe(2);
    });

    it("applies and is strippable when granted dynamically (addsAbility)", () => {
        const granted = shoot(withGrantedStealth(baseInfernus));
        expect(granted.hitPhase.targetRoll).toBe(3);

        const ignored = shoot(withGrantedStealth(baseInfernus), ignoresCoverAttacker);
        expect(ignored.hitPhase.targetRoll).toBe(2);
    });

    it("does NOT penalise a stealthy unit's own shooting (stealth on the attacker)", () => {
        const stealthyAttacker = {
            ...(heavyIntercessors as unknown as TestUnit),
            abilities: [
                ...((heavyIntercessors as unknown as TestUnit).abilities ?? []),
                stealthAbilityObj,
            ],
        } as unknown as TestUnit;

        const result = runCombat(
            buildCombatContext({
                attacker: stealthyAttacker,
                defender: baseInfernus,
                weaponProfile: heavyBoltRifle,
                engagementPhase: "shooting",
            }),
        );

        // Stealth on the shooter must be inert → base 2+ (HEAVY, stationary), not 3+.
        expect(result.hitPhase.targetRoll).toBe(2);
    });
});
