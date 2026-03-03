import { describe, it, expect } from "vitest";
import { collectWeaponMechanics } from "../collectWeaponMechanics";
import { CombatContext } from "@/app/types/CombatContext";
import { WeaponProfile } from "@/app/types/Weapon";

const makeContext = (
    attributes: string[],
    range: number | string = 24,
): CombatContext =>
    ({
        weaponProfile: {
            attributes,
            range,
        } as WeaponProfile,
    }) as CombatContext;

describe("collectWeaponMechanics", () => {
    it("collects a non-parameterised attribute (ASSAULT)", () => {
        const result = collectWeaponMechanics(makeContext(["ASSAULT"]));
        expect(result).toHaveLength(1);
        expect(result[0].mechanic.effect).toBe("addsBehaviour");
        expect(result[0].layer).toBe("weaponAttribute");
        expect(result[0].perspective).toBe("attacker");
    });

    it("collects ANTI-INFANTRY 4+ with hydrated values", () => {
        const result = collectWeaponMechanics(
            makeContext(["ANTI-INFANTRY 4+"]),
        );
        expect(result).toHaveLength(1);
        const m = result[0].mechanic;
        expect(m.effect).toBe("criticalWound");
        expect(m.attribute).toBe("wound");
        expect(m.value).toBe(4);
        expect(m.conditions![0].value).toBe("INFANTRY");
        expect(m.conditions![0].keywords).toEqual(["INFANTRY"]);
    });

    it("collects SUSTAINED HITS 1 with hydrated param and critical", () => {
        const result = collectWeaponMechanics(
            makeContext(["SUSTAINED HITS 1"]),
        );
        expect(result).toHaveLength(1);
        const m = result[0].mechanic;
        expect(m.effect).toBe("extraSuccess");
        expect(m.value).toBe(1);
        expect(m.conditions![0].value).toBe(6);
    });

    it("collects MELTA 2 with hydrated param and halfRange", () => {
        const result = collectWeaponMechanics(
            makeContext(["MELTA 2"], 24),
        );
        expect(result).toHaveLength(1);
        const m = result[0].mechanic;
        expect(m.effect).toBe("rollBonus");
        expect(m.attribute).toBe("damage");
        expect(m.value).toBe(2);
        expect(m.conditions![0].value).toBe(12);
    });

    it("collects RAPID FIRE 1 with hydrated param and halfRange", () => {
        const result = collectWeaponMechanics(
            makeContext(["RAPID FIRE 1"], 30),
        );
        expect(result).toHaveLength(1);
        const m = result[0].mechanic;
        expect(m.effect).toBe("rollBonus");
        expect(m.attribute).toBe("attacks");
        expect(m.value).toBe(1);
        expect(m.conditions![0].value).toBe(15);
    });

    it("collects multiple attributes from the same weapon", () => {
        const result = collectWeaponMechanics(
            makeContext(["ANTI-PSYKER 4+", "DEVASTATING WOUNDS"]),
        );
        expect(result).toHaveLength(2);
        expect(result[0].mechanic.value).toBe(4);
        expect(result[1].mechanic.effect).toBe("mortalWounds");
    });

    it("skips melee weapons for halfRange (no crash)", () => {
        const result = collectWeaponMechanics(
            makeContext(["MELTA 2"], "Melee"),
        );
        expect(result).toHaveLength(1);
        expect(result[0].mechanic.value).toBe(2);
    });

    it("ignores unrecognised attributes", () => {
        const result = collectWeaponMechanics(
            makeContext(["MADE UP THING"]),
        );
        expect(result).toHaveLength(0);
    });

    it("still collects existing non-parameterised attributes", () => {
        const result = collectWeaponMechanics(
            makeContext(["HEAVY", "TORRENT", "IGNORES COVER"]),
        );
        expect(result).toHaveLength(3);
    });
});
