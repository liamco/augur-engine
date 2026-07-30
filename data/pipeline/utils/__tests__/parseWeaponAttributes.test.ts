import { describe, it, expect } from "vitest";
import { parseWeaponAttributes } from "../parseWeaponAttributes";

describe("parseWeaponAttributes", () => {
    it("returns nothing for a weapon with no attributes", () => {
        expect(parseWeaponAttributes("")).toEqual([]);
    });

    it("splits a comma-separated list into uppercased attributes", () => {
        expect(parseWeaponAttributes("blast, indirect fire")).toEqual([
            "BLAST",
            "INDIRECT FIRE",
        ]);
    });

    it("normalises the inconsistent casing the source uses", () => {
        expect(parseWeaponAttributes("PISTOl")).toEqual(["PISTOL"]);
        expect(parseWeaponAttributes("Ignores Cover")).toEqual([
            "IGNORES COVER",
        ]);
        expect(parseWeaponAttributes("TWIN-LINKED")).toEqual(["TWIN-LINKED"]);
    });

    it("keeps a numeric parameter", () => {
        expect(parseWeaponAttributes("rapid fire 2")).toEqual(["RAPID FIRE 2"]);
        expect(parseWeaponAttributes("melta 4")).toEqual(["MELTA 4"]);
        expect(parseWeaponAttributes("sustained hits 1")).toEqual([
            "SUSTAINED HITS 1",
        ]);
    });

    it("keeps a dice parameter", () => {
        expect(parseWeaponAttributes("sustained hits d3")).toEqual([
            "SUSTAINED HITS D3",
        ]);
        expect(parseWeaponAttributes("rapid fire d6")).toEqual([
            "RAPID FIRE D6",
        ]);
    });

    it("formats anti with its keyword and threshold", () => {
        expect(parseWeaponAttributes("anti-infantry 4+")).toEqual([
            "ANTI-INFANTRY 4+",
        ]);
        expect(parseWeaponAttributes("anti-tyranids 4+")).toEqual([
            "ANTI-TYRANIDS 4+",
        ]);
    });

    it("adds the missing + to an anti threshold", () => {
        expect(parseWeaponAttributes("anti-vehicle 2")).toEqual([
            "ANTI-VEHICLE 2+",
        ]);
    });

    it("collapses irregular whitespace", () => {
        expect(parseWeaponAttributes("  rapid   fire  1 ")).toEqual([
            "RAPID FIRE 1",
        ]);
    });

    it("handles an apostrophe in an attribute name", () => {
        expect(
            parseWeaponAttributes(
                "ignores cover, devastating wounds, torrent, c'tan power",
            ),
        ).toEqual([
            "IGNORES COVER",
            "DEVASTATING WOUNDS",
            "TORRENT",
            "C'TAN POWER",
        ]);
    });

    it("tolerates the bracketed form", () => {
        expect(parseWeaponAttributes("[ASSAULT], [SUSTAINED HITS 1]")).toEqual([
            "ASSAULT",
            "SUSTAINED HITS 1",
        ]);
    });

    it("passes an unrecognised attribute through rather than dropping it", () => {
        expect(parseWeaponAttributes("blast, some new ability 3")).toEqual([
            "BLAST",
            "SOME NEW ABILITY 3",
        ]);
    });

    it("ignores empty entries from a trailing separator", () => {
        expect(parseWeaponAttributes("heavy,")).toEqual(["HEAVY"]);
    });
});
