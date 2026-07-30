import { describe, it, expect } from "vitest";
import { weaponAbilityGrant, coreAbilityGrant, feelNoPainGrant } from "../patterns/grants";

const wa = (t: string) => weaponAbilityGrant.extract(t, { abilityName: "Test" });
const ca = (t: string) => coreAbilityGrant.extract(t, { abilityName: "Test" });
const fnp = (t: string) => feelNoPainGrant.extract(t, { abilityName: "Test" });

describe("weaponAbilityGrant", () => {
    it("grants a bracketed weapon ability with its parameter", () => {
        expect(
            wa("weapons equipped by models in this unit have the [SUSTAINED HITS 1] ability."),
        ).toEqual([
            {
                name: "Test",
                entity: "thisUnit",
                effect: "addsWeaponAttribute",
                weaponAttributes: ["SUSTAINED HITS"],
                value: 1,
            },
        ]);
    });

    it("grants a parameterless weapon ability with value true", () => {
        expect(
            wa("melee weapons equipped by models in this unit have the [LETHAL HITS] ability."),
        ).toEqual([
            {
                name: "Test",
                entity: "thisUnit",
                effect: "addsWeaponAttribute",
                weaponAttributes: ["LETHAL HITS"],
                value: true,
            },
        ]);
    });

    it("adds the leading condition when the grant comes from an attached leader", () => {
        const out = wa(
            "While this model is leading a unit, weapons equipped by models in that unit have the [SUSTAINED HITS 1] ability.",
        );
        expect(out?.[0].conditions).toEqual([
            {
                entity: "thisUnit",
                state: "isLeadingUnit",
                operator: "equals",
                value: true,
            },
        ]);
    });

    it("declines when more than one weapon ability is granted", () => {
        // Two grants usually means two different conditions govern them.
        expect(
            wa("that attack has the [LETHAL HITS] ability and the [PRECISION] ability."),
        ).toBeNull();
    });

    it("returns null with no grant present", () => {
        expect(wa("Add 1 to the Hit roll.")).toBeNull();
    });
});

describe("feelNoPainGrant", () => {
    it("emits setsFnp with the threshold", () => {
        expect(
            fnp("models in this unit have the Feel No Pain 5+ ability."),
        ).toEqual([
            {
                name: "Test",
                entity: "thisUnit",
                effect: "setsFnp",
                attribute: "feelNoPain",
                value: 5,
            },
        ]);
    });

    it("returns null without a threshold", () => {
        expect(fnp("this unit has the Feel No Pain ability.")).toBeNull();
    });
});

describe("coreAbilityGrant", () => {
    it("grants a named core ability", () => {
        expect(ca("models in this unit have the Stealth ability.")).toEqual([
            {
                name: "Test",
                entity: "thisUnit",
                effect: "addsAbility",
                abilities: ["STEALTH"],
                value: true,
            },
        ]);
    });

    it("carries the parameter on a parameterised core ability", () => {
        expect(ca('this unit has the Scouts 6" ability.')).toEqual([
            {
                name: "Test",
                entity: "thisUnit",
                effect: "addsAbility",
                abilities: ["SCOUTS"],
                value: 6,
            },
        ]);
    });

    it("returns null for an ability outside the known core list", () => {
        expect(ca("this unit has the Bananas ability.")).toBeNull();
    });
});
