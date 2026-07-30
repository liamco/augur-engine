import { describe, it, expect } from "vitest";
import { keywordGrant } from "../patterns/keywords";

const run = (t: string) => keywordGrant.extract(t, { abilityName: "Test" });

describe("keywordGrant", () => {
    it("grants the GRENADES keyword", () => {
        expect(run("The bearer has the GRENADES keyword.")).toEqual([
            {
                name: "Test",
                entity: "thisUnit",
                effect: "addsKeyword",
                keywords: ["GRENADES"],
                value: true,
            },
        ]);
    });

    it("grants the SMOKE keyword", () => {
        expect(run("The bearer has the SMOKE keyword.")?.[0].keywords).toEqual([
            "SMOKE",
        ]);
    });

    it("grants FLY from the 'can fly' phrasing", () => {
        expect(run("The bearer can fly.")?.[0].keywords).toEqual(["FLY"]);
    });

    it("handles the plural 'have the ... keyword' form", () => {
        expect(
            run("Models in this unit have the GRENADES keyword.")?.[0].keywords,
        ).toEqual(["GRENADES"]);
    });

    it("declines when more than one keyword is granted", () => {
        // Two grants usually means two different conditions govern them.
        expect(
            run("The bearer has the SMOKE keyword and the GRENADES keyword."),
        ).toBeNull();
    });

    it("returns null when no keyword is granted", () => {
        expect(run("Add 1 to the Hit roll.")).toBeNull();
    });

    it("does not fire on a keyword merely mentioned as a condition", () => {
        // "targets a unit with the FLY keyword" is a condition, not a grant.
        expect(
            run("Each time this model makes an attack that targets a unit with the FLY keyword, add 1 to the Hit roll."),
        ).toBeNull();
    });
});
