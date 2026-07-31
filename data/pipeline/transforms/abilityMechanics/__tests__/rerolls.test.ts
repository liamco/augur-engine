import { describe, it, expect } from "vitest";
import { rerolls } from "../patterns/rerolls";

const extract = (text: string) =>
    rerolls.extract(text, { abilityName: "Test" }) ?? [];

describe("rerolls pattern", () => {
    describe("the phrasing the corpus actually uses", () => {
        it('reads "you can re-roll the Hit roll"', () => {
            // The definite singular is by far the commonest form — 30 distinct
            // unparsed texts used it while the pattern only allowed "a"/"all".
            const [mechanic] = extract(
                "Each time this model makes a melee attack, you can re-roll the Hit roll.",
            );
            expect(mechanic).toMatchObject({
                effect: "reroll",
                attribute: "hit",
                value: true,
                phase: ["fight"],
            });
        });

        it('reads "you can re-roll the Wound roll"', () => {
            const [mechanic] = extract(
                "Each time this model makes an attack, you can re-roll the Wound roll.",
            );
            expect(mechanic).toMatchObject({ attribute: "wound", value: true });
        });

        it("reads both clauses in one description", () => {
            const result = extract(
                "Each time this model makes a melee attack that targets a CHARACTER unit, you can re-roll the Hit roll and you can re-roll the Wound roll.",
            );
            expect(result.map((m) => m.attribute)).toEqual(["hit", "wound"]);
        });
    });

    describe("the phrasings it already handled", () => {
        it('reads "re-roll a Hit roll of 1"', () => {
            const [mechanic] = extract(
                "Each time this model makes an attack, re-roll a Hit roll of 1.",
            );
            expect(mechanic).toMatchObject({ value: 1 });
        });

        it('reads "re-roll failed Wound rolls"', () => {
            const [mechanic] = extract(
                "Each time this model makes an attack, re-roll failed Wound rolls.",
            );
            expect(mechanic).toMatchObject({ attribute: "wound", value: "failed" });
        });

        it('reads bare "re-roll Hit rolls"', () => {
            const [mechanic] = extract(
                "Each time this model makes an attack, re-roll Hit rolls.",
            );
            expect(mechanic).toMatchObject({ value: true });
        });
    });

    describe("precedence", () => {
        it("prefers the roll-of-1 scope over the general one", () => {
            // "re-roll a Hit roll of 1" also matches the looser pattern, and the
            // narrower reading is the correct one.
            const [mechanic] = extract(
                "Each time this model makes an attack, you can re-roll a Hit roll of 1.",
            );
            expect(mechanic.value).toBe(1);
        });

        it("prefers failed over the general scope", () => {
            const [mechanic] = extract(
                "Each time this model makes an attack, you can re-roll failed Hit rolls.",
            );
            expect(mechanic.value).toBe("failed");
        });
    });

    describe("what it declines", () => {
        it("declines an imposed re-roll, which benefits the other side", () => {
            expect(
                extract(
                    "Each time an attack targets this unit, the attacker must re-roll the Hit roll.",
                ),
            ).toEqual([]);
        });

        it("declines when there is no re-roll at all", () => {
            expect(extract("Add 1 to the Hit roll.")).toEqual([]);
        });

        it("declines a re-roll of something it does not model", () => {
            expect(
                extract("Each time this model makes an attack, you can re-roll the Charge roll."),
            ).toEqual([]);
        });
    });
});
