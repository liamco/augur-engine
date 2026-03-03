import { describe, it, expect } from "vitest";
import { collectWeaponBehaviours } from "../collectWeaponBehaviours";
import { Mechanic } from "@/app/types/Mechanic";

describe("collectWeaponBehaviours", () => {
    it("returns advanceAndShoot for a weapon with ASSAULT attribute", () => {
        const result = collectWeaponBehaviours(["ASSAULT"], []);
        expect(result).toContain("advanceAndShoot");
    });

    it("returns empty for a weapon with no behaviour attributes", () => {
        const result = collectWeaponBehaviours(["HEAVY", "MELTA 2"], []);
        expect(result).toEqual([]);
    });

    it("includes unit-level behaviours from ability mechanics", () => {
        const mechanics: Mechanic[] = [
            {
                name: "test-ability",
                entity: "thisUnit",
                effect: "addsBehaviour",
                value: true,
                behaviours: ["fallBackAndShoot"],
            },
        ];
        const result = collectWeaponBehaviours([], mechanics);
        expect(result).toContain("fallBackAndShoot");
    });

    it("combines weapon-level and unit-level behaviours", () => {
        const mechanics: Mechanic[] = [
            {
                name: "test-ability",
                entity: "thisUnit",
                effect: "addsBehaviour",
                value: true,
                behaviours: ["advanceAndCharge"],
            },
        ];
        const result = collectWeaponBehaviours(["ASSAULT"], mechanics);
        expect(result).toContain("advanceAndShoot");
        expect(result).toContain("advanceAndCharge");
    });

    it("deduplicates when same behaviour comes from both sources", () => {
        const mechanics: Mechanic[] = [
            {
                name: "redundant",
                entity: "thisUnit",
                effect: "addsBehaviour",
                value: true,
                behaviours: ["advanceAndShoot"],
            },
        ];
        const result = collectWeaponBehaviours(["ASSAULT"], mechanics);
        const count = result.filter((b) => b === "advanceAndShoot").length;
        expect(count).toBe(1);
    });
});
