import { describe, it, expect } from "vitest";
import { isCharacter } from "../isCharacter";
import { TestUnit } from "@/app/types/Test";

const unit = (...keywords: string[]): TestUnit =>
    ({
        keywords: keywords.map((keyword) => ({
            keyword,
            model: "",
            isFactionKeyword: false,
        })),
    }) as unknown as TestUnit;

describe("isCharacter", () => {
    it("recognises the CHARACTER keyword regardless of the casing the codex uses", () => {
        // The codex title-cases keywords ("Character"); the rulebook shouts them.
        expect(isCharacter(unit("Character", "Infantry"))).toBe(true);
        expect(isCharacter(unit("CHARACTER"))).toBe(true);
    });

    it("is false for a unit without it", () => {
        expect(isCharacter(unit("Infantry", "Tacticus"))).toBe(false);
    });

    it("does not match a keyword that merely contains it", () => {
        expect(isCharacter(unit("Character Mount"))).toBe(false);
    });

    it("treats a unit with no keywords as not a character", () => {
        expect(isCharacter(unit())).toBe(false);
    });
});
