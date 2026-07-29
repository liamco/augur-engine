import { describe, it, expect } from "vitest";
import { evaluateOperator } from "../operatorEvaluator";

describe("evaluateOperator", () => {
    describe("includes", () => {
        it("matches a string in an array (exact case)", () => {
            expect(evaluateOperator("includes", ["Psyker"], "Psyker")).toBe(
                true,
            );
        });

        it("matches a string in an array (case-insensitive)", () => {
            expect(evaluateOperator("includes", ["Psyker"], "PSYKER")).toBe(
                true,
            );
        });

        it("returns false when string is not in array", () => {
            expect(evaluateOperator("includes", ["Infantry"], "PSYKER")).toBe(
                false,
            );
        });

        it("matches all expected strings case-insensitively", () => {
            expect(
                evaluateOperator(
                    "includes",
                    ["Psyker", "Infantry"],
                    ["PSYKER", "INFANTRY"],
                ),
            ).toBe(true);
        });

        it("returns false when not all expected strings match", () => {
            expect(
                evaluateOperator(
                    "includes",
                    ["Psyker"],
                    ["PSYKER", "INFANTRY"],
                ),
            ).toBe(false);
        });

        it("still handles non-string values with strict equality", () => {
            expect(evaluateOperator("includes", [1, 2, 3], 2)).toBe(true);
            expect(evaluateOperator("includes", [1, 2, 3], 4)).toBe(false);
        });

        it("returns false when actual is not an array", () => {
            expect(evaluateOperator("includes", "Psyker", "Psyker")).toBe(
                false,
            );
        });
    });

    describe("notIncludes", () => {
        it("returns true when string is not in array", () => {
            expect(
                evaluateOperator("notIncludes", ["Infantry"], "PSYKER"),
            ).toBe(true);
        });

        it("returns false when string is in array (case-insensitive)", () => {
            expect(
                evaluateOperator("notIncludes", ["Psyker"], "PSYKER"),
            ).toBe(false);
        });

        it("returns true when none of expected strings match", () => {
            expect(
                evaluateOperator(
                    "notIncludes",
                    ["Infantry"],
                    ["PSYKER", "MONSTER"],
                ),
            ).toBe(true);
        });

        it("returns false when any expected string matches (case-insensitive)", () => {
            expect(
                evaluateOperator(
                    "notIncludes",
                    ["Psyker", "Infantry"],
                    ["PSYKER", "MONSTER"],
                ),
            ).toBe(false);
        });

        it("returns true when actual is not an array", () => {
            expect(
                evaluateOperator("notIncludes", "Psyker", "Psyker"),
            ).toBe(true);
        });
    });

    describe("includesAny", () => {
        it("is true when arrays intersect (case-insensitive)", () => {
            expect(
                evaluateOperator(
                    "includesAny",
                    ["INFANTRY", "VEHICLE"],
                    ["swarm", "infantry"],
                ),
            ).toBe(true);
        });

        it("is false when arrays are disjoint", () => {
            expect(
                evaluateOperator(
                    "includesAny",
                    ["VEHICLE"],
                    ["INFANTRY", "SWARM", "BEAST"],
                ),
            ).toBe(false);
        });

        it("is false when actual is not an array", () => {
            expect(
                evaluateOperator("includesAny", undefined, ["INFANTRY"]),
            ).toBe(false);
        });
    });
});
