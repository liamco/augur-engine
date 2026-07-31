import { describe, it, expect } from "vitest";
import { findListSize, listSizes } from "../listSizes";

describe("listSizes", () => {
    it("exposes the three sizes from the library bootstrap", () => {
        expect(listSizes.map((s) => s.name)).toEqual([
            "incursion",
            "strike-force",
            "onslaught",
        ]);
    });

    it("carries both budgets, since a list is constrained by each", () => {
        expect(listSizes).toEqual([
            { name: "incursion", pointLimit: 1000, detachmentPointBudget: 2 },
            { name: "strike-force", pointLimit: 2000, detachmentPointBudget: 3 },
            { name: "onslaught", pointLimit: 3000, detachmentPointBudget: 3 },
        ]);
    });
});

describe("findListSize", () => {
    it("finds a size by name", () => {
        expect(findListSize("strike-force")?.pointLimit).toBe(2000);
    });

    it("returns null for an unknown name rather than guessing a default", () => {
        // A stored list naming a size we no longer have must surface as invalid,
        // not silently validate against the wrong budget.
        expect(findListSize("apocalypse")).toBeNull();
        expect(findListSize("")).toBeNull();
    });
});
