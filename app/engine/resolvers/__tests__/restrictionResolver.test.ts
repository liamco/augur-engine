import { describe, it, expect } from "vitest";
import { resolveRestrictions } from "../restrictionResolver";

describe("resolveRestrictions", () => {
    it("returns no restrictions when movement is hold", () => {
        const result = resolveRestrictions("hold", []);
        expect(result).toEqual({ shoot: true, charge: true });
    });

    it("returns no restrictions when movement is move", () => {
        const result = resolveRestrictions("move", []);
        expect(result).toEqual({ shoot: true, charge: true });
    });

    it("returns no restrictions when movement is null", () => {
        const result = resolveRestrictions(null, []);
        expect(result).toEqual({ shoot: true, charge: true });
    });

    it("restricts shoot and charge when advancing with no overrides", () => {
        const result = resolveRestrictions("advance", []);
        expect(result).toEqual({ shoot: false, charge: false });
    });

    it("restricts shoot and charge when falling back with no overrides", () => {
        const result = resolveRestrictions("fallBack", []);
        expect(result).toEqual({ shoot: false, charge: false });
    });

    it("lifts shoot restriction when advancing with advanceAndShoot", () => {
        const result = resolveRestrictions("advance", ["advanceAndShoot"]);
        expect(result).toEqual({ shoot: true, charge: false });
    });

    it("lifts charge restriction when advancing with advanceAndCharge", () => {
        const result = resolveRestrictions("advance", ["advanceAndCharge"]);
        expect(result).toEqual({ shoot: false, charge: true });
    });

    it("lifts both restrictions with multiple behaviours", () => {
        const result = resolveRestrictions("advance", [
            "advanceAndShoot",
            "advanceAndCharge",
        ]);
        expect(result).toEqual({ shoot: true, charge: true });
    });

    it("lifts shoot restriction when falling back with fallBackAndShoot", () => {
        const result = resolveRestrictions("fallBack", [
            "fallBackAndShoot",
        ]);
        expect(result).toEqual({ shoot: true, charge: false });
    });

    it("ignores behaviours that don't match current movement", () => {
        const result = resolveRestrictions("advance", [
            "fallBackAndShoot",
        ]);
        expect(result).toEqual({ shoot: false, charge: false });
    });
});
