import { describe, it, expect } from "vitest";
import {
    parseMovement,
    parseSkill,
    parseSaveStat,
    parseDamageOrAttacks,
    parseIntOrNull,
    parseBoolString,
    parseRange,
    parseWeaponSkill,
} from "../../utils/parseStats";

describe("parseMovement", () => {
    it('strips trailing quote and parses: "12\\""→ 12', () => {
        expect(parseMovement('12"')).toBe(12);
    });
    it("parses plain number string", () => {
        expect(parseMovement("6")).toBe(6);
    });
    it('returns null for "-"', () => {
        expect(parseMovement("-")).toBeNull();
    });
});

describe("parseSkill", () => {
    it('strips trailing +: "4+" → 4', () => {
        expect(parseSkill("4+")).toBe(4);
    });
    it('returns null for "-"', () => {
        expect(parseSkill("-")).toBeNull();
    });
    it("parses plain number", () => {
        expect(parseSkill("7+")).toBe(7);
    });
});

describe("parseSaveStat", () => {
    it('parses invulnerable save: "4+" → 4', () => {
        expect(parseSaveStat("4+")).toBe(4);
    });
    it('returns null for "-"', () => {
        expect(parseSaveStat("-")).toBeNull();
    });
});

describe("parseDamageOrAttacks", () => {
    it("parses plain number", () => {
        expect(parseDamageOrAttacks("6")).toBe(6);
    });
    it("parses negative number", () => {
        expect(parseDamageOrAttacks("-1")).toBe(-1);
    });
    it("keeps dice expressions as strings", () => {
        expect(parseDamageOrAttacks("D6")).toBe("D6");
        expect(parseDamageOrAttacks("2D6+1")).toBe("2D6+1");
        expect(parseDamageOrAttacks("D3")).toBe("D3");
    });
    it('returns null for "-"', () => {
        expect(parseDamageOrAttacks("-")).toBeNull();
    });
});

describe("parseIntOrNull", () => {
    it("parses integer", () => {
        expect(parseIntOrNull("5")).toBe(5);
    });
    it('returns null for "-"', () => {
        expect(parseIntOrNull("-")).toBeNull();
    });
    it("returns null for non-numeric", () => {
        expect(parseIntOrNull("abc")).toBeNull();
    });
});

describe("parseBoolString", () => {
    it('"true" → true', () => {
        expect(parseBoolString("true")).toBe(true);
    });
    it('"false" → false', () => {
        expect(parseBoolString("false")).toBe(false);
    });
});

describe("parseRange", () => {
    it('keeps "Melee" as string', () => {
        expect(parseRange("Melee")).toBe("Melee");
    });
    it('parses ranged: \'18"\' → 18', () => {
        expect(parseRange('18"')).toBe(18);
    });
    it('returns null for "-"', () => {
        expect(parseRange("-")).toBeNull();
    });
});

describe("parseWeaponSkill", () => {
    it("parses normal skill", () => {
        expect(parseWeaponSkill("2")).toBe(2);
    });
    it("parses skill with +", () => {
        expect(parseWeaponSkill("4+")).toBe(4);
    });
    it('"-" → "N/A" for torrent weapons', () => {
        expect(parseWeaponSkill("-")).toBe("N/A");
    });
});
