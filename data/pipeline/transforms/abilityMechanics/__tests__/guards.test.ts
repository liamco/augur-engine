import { describe, it, expect } from "vitest";
import { cleanDescription } from "../cleanDescription";
import {
    hasMultipleConditionalModifiers,
    resolveDirection,
    resolvePhase,
} from "../guards";

describe("cleanDescription", () => {
    it("strips HTML and normalises smart punctuation", () => {
        expect(
            cleanDescription(
                '<p>Each time a <span class="kwb">TYRANIDS</span> model’s attack — a ranged one —  hits</p>',
            ),
        ).toBe("Each time a TYRANIDS model's attack - a ranged one - hits");
    });

    it("returns an empty string for missing input", () => {
        expect(cleanDescription(null)).toBe("");
        expect(cleanDescription(undefined)).toBe("");
    });
});

describe("hasMultipleConditionalModifiers", () => {
    it("defers a description with two modifiers under different conditions", () => {
        expect(
            hasMultipleConditionalModifiers(
                "add 1 to the Hit roll. If the target is Battle-shocked, add 1 to the Wound roll as well.",
            ),
        ).toBe(true);
    });

    it("allows a single unconditional modifier", () => {
        expect(hasMultipleConditionalModifiers("add 1 to the Hit roll")).toBe(false);
    });

    it("allows a single modifier with one condition", () => {
        expect(
            hasMultipleConditionalModifiers(
                "While this model is leading a unit, add 1 to the Hit roll",
            ),
        ).toBe(false);
    });
});

describe("resolveDirection", () => {
    it("reads an attacker's own modifier as 'own'", () => {
        expect(
            resolveDirection(
                "Each time a model in this unit makes an attack, add 1 to the Hit roll.",
            ),
        ).toBe("own");
    });

    it("reads a modifier imposed on attackers as 'imposed'", () => {
        expect(
            resolveDirection(
                "Each time a ranged attack targets this unit, subtract 1 from the Hit roll.",
            ),
        ).toBe("imposed");
    });

    it("reads allocation wording as 'imposed'", () => {
        expect(
            resolveDirection(
                "Each time an attack is allocated to a model in this unit, subtract 1 from the Hit roll.",
            ),
        ).toBe("imposed");
    });

    it("returns 'unknown' when neither phrasing is present", () => {
        expect(resolveDirection("This unit has the Scouts 6\" ability.")).toBe(
            "unknown",
        );
    });
});

describe("resolvePhase", () => {
    it("restricts to fight for melee wording", () => {
        expect(resolvePhase("Each time this model makes a melee attack")).toEqual([
            "fight",
        ]);
    });

    it("restricts to shooting for ranged wording", () => {
        expect(resolvePhase("Each time this model makes a ranged attack")).toEqual([
            "shooting",
        ]);
    });

    it("leaves the phase unrestricted when both or neither appear", () => {
        expect(resolvePhase("Each time this model makes an attack")).toBeUndefined();
        expect(
            resolvePhase("melee attacks and ranged attacks alike"),
        ).toBeUndefined();
    });
});
