import { describe, it, expect } from "vitest";
import { resolveEffects } from "../effectResolver";
import { TaggedMechanic } from "../../collectors/collectAllMechanics";
import { Attribute } from "@/app/types/Mechanic";

const setsChar = (
    attribute: Attribute,
    value: number,
    name = "Enhancement",
): TaggedMechanic => ({
    mechanic: { name, entity: "thisUnit", effect: "setsCharacteristic", attribute, value },
    layer: "enhancement",
    perspective: "defender",
});

describe("resolveEffects — setsCharacteristic", () => {
    it("exposes the set value on the attribute's effect set", () => {
        const resolved = resolveEffects([setsChar("save", 2)]);
        expect(resolved.get("save")?.setsCharacteristic).toBe(2);
    });

    it("keeps the best of two sets — lower wins for a save", () => {
        // Two enhancements both setting Save: 2+ beats 4+.
        const resolved = resolveEffects([setsChar("save", 4), setsChar("save", 2)]);
        expect(resolved.get("save")?.setsCharacteristic).toBe(2);
    });

    it("keeps the best of two sets — lower wins for an invulnerable save", () => {
        const resolved = resolveEffects([
            setsChar("invulnSave", 5),
            setsChar("invulnSave", 4),
        ]);
        expect(resolved.get("invulnSave")?.setsCharacteristic).toBe(4);
    });

    it("keeps the best of two sets — higher wins for toughness", () => {
        const resolved = resolveEffects([
            setsChar("toughness", 5),
            setsChar("toughness", 8),
        ]);
        expect(resolved.get("toughness")?.setsCharacteristic).toBe(8);
    });

    it("records each set as a source so the lab can show where it came from", () => {
        const resolved = resolveEffects([
            setsChar("save", 2, "Artificer Armour"),
            setsChar("save", 4, "Other"),
        ]);
        expect(
            resolved.get("save")?.sources.map((s) => s.mechanicName),
        ).toEqual(["Artificer Armour", "Other"]);
    });

    it("leaves other effects on the same attribute untouched", () => {
        const penalty: TaggedMechanic = {
            mechanic: {
                name: "Cover",
                entity: "thisUnit",
                effect: "rollBonus",
                attribute: "save",
                value: 1,
            },
            layer: "unitAbility",
            perspective: "defender",
        };
        const resolved = resolveEffects([setsChar("save", 2), penalty]);
        expect(resolved.get("save")?.setsCharacteristic).toBe(2);
        expect(resolved.get("save")?.rollBonus).toBe(1);
    });
});
