import { describe, it, expect } from "vitest";
import { resolveTargetEligibility } from "../eligibilityResolver";
import { CombatContext } from "@/app/types/CombatContext";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { TaggedMechanic } from "../../collectors/collectAllMechanics";

const ctx = (rangeToTarget?: number, detectionRange?: number): CombatContext =>
    ({
        attacker: { combatState: {} },
        defender: { combatState: {}, models: [{ detectionRange }] },
        weaponProfile: {},
        rangeToTarget,
    }) as unknown as CombatContext;

const hiddenMech = (): TaggedMechanic =>
    ({
        mechanic: {
            name: "Hidden",
            entity: "thisUnit",
            effect: "blocksTargeting",
            value: true,
        },
        layer: "unitAbility",
        perspective: "defender",
    }) as unknown as TaggedMechanic;

const noMods: ResolvedModifiers = new Map();

describe("resolveTargetEligibility", () => {
    it("is ineligible when hidden and range exceeds detection (default 15)", () => {
        const r = resolveTargetEligibility([hiddenMech()], ctx(20), noMods);
        expect(r.eligible).toBe(false);
        expect(r.reason).toBe("Hidden");
    });

    it("is eligible when within detection range", () => {
        expect(
            resolveTargetEligibility([hiddenMech()], ctx(10), noMods).eligible,
        ).toBe(true);
    });

    it("is eligible when range is unknown (undefined)", () => {
        expect(
            resolveTargetEligibility([hiddenMech()], ctx(undefined), noMods)
                .eligible,
        ).toBe(true);
    });

    it("is eligible when no blocksTargeting mechanic is present", () => {
        expect(resolveTargetEligibility([], ctx(20), noMods).eligible).toBe(
            true,
        );
    });

    it("respects a detectionRange staticNumber modifier", () => {
        const mods: ResolvedModifiers = new Map([
            ["detectionRange", { staticNumber: 25, sources: [] }],
        ]);
        expect(
            resolveTargetEligibility([hiddenMech()], ctx(20), mods).eligible,
        ).toBe(true);
    });

    it("uses the datasheet detectionRange when present", () => {
        // detectionRange 12, range 14 -> beyond -> ineligible
        expect(
            resolveTargetEligibility([hiddenMech()], ctx(14, 12), noMods)
                .eligible,
        ).toBe(false);
    });
});
