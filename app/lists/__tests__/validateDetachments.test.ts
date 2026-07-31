import { describe, it, expect } from "vitest";
import {
    validateDetachments,
    type DetachmentChoice,
} from "../validateDetachments";

const det = (
    slug: string,
    detachmentPoints: number | null | undefined,
    factionSlug = "space-marines",
): DetachmentChoice => ({
    slug,
    name: slug,
    factionSlug,
    detachmentPoints,
});

const catalogue: DetachmentChoice[] = [
    det("gladius-task-force", 2),
    det("anvil-siege-force", 1),
    det("black-spear-task-force", 3),
    det("boarding-strike", null), // unpriced — no plugins.json entry
    det("awakened-dynasty", 2, "necrons"),
];

const validate = (slugs: string[], listSize = "strike-force") =>
    validateDetachments({
        slugs,
        listSize,
        factionSlug: "space-marines",
        catalogue,
    });

describe("validateDetachments — budgets", () => {
    it("accepts a selection inside the budget", () => {
        const result = validate(["gladius-task-force"]);
        expect(result.valid).toBe(true);
        expect(result.spent).toBe(2);
        expect(result.budget).toBe(3);
        expect(result.problems).toEqual([]);
    });

    it("accepts several detachments that together fit", () => {
        // 2 + 1 = 3, exactly the strike-force budget.
        const result = validate(["gladius-task-force", "anvil-siege-force"]);
        expect(result.valid).toBe(true);
        expect(result.spent).toBe(3);
    });

    it("rejects a combination that exceeds the budget", () => {
        const result = validate(["gladius-task-force", "black-spear-task-force"]);
        expect(result.valid).toBe(false);
        expect(result.spent).toBe(5);
        expect(result.problems).toContainEqual({
            kind: "overBudget",
            spent: 5,
            budget: 3,
        });
    });

    it("refuses a 3-point detachment at incursion but allows it at strike-force", () => {
        // Incursion's budget of 2 puts every 3-point detachment out of reach —
        // 15 of the 69 in the codex.
        expect(validate(["black-spear-task-force"], "incursion").valid).toBe(false);
        expect(validate(["black-spear-task-force"], "strike-force").valid).toBe(true);
    });

    it("treats an empty selection as incomplete rather than valid", () => {
        // A list with no detachment is not playable, and silently passing would
        // let the editor call it done.
        const result = validate([]);
        expect(result.valid).toBe(false);
        expect(result.problems).toContainEqual({ kind: "noDetachment" });
    });
});

describe("validateDetachments — what it refuses to guess", () => {
    it("reports an unpriced detachment instead of treating it as free", () => {
        // 12 of 69 have detachmentPoints null because plugins.json has no entry.
        // Counting them as 0 would let a list bypass the budget entirely.
        const result = validate(["boarding-strike"]);
        expect(result.valid).toBe(false);
        expect(result.problems).toContainEqual({
            kind: "unpricedDetachment",
            slug: "boarding-strike",
            name: "boarding-strike",
        });
    });

    it("does not add an unpriced detachment into the spend", () => {
        const result = validate(["gladius-task-force", "boarding-strike"]);
        expect(result.spent).toBe(2);
    });

    it("reports an unknown slug", () => {
        const result = validate(["no-such-detachment"]);
        expect(result.valid).toBe(false);
        expect(result.problems).toContainEqual({
            kind: "unknownDetachment",
            slug: "no-such-detachment",
        });
    });

    it("reports a detachment from the wrong faction", () => {
        const result = validate(["awakened-dynasty"]);
        expect(result.valid).toBe(false);
        expect(result.problems).toContainEqual({
            kind: "wrongFaction",
            slug: "awakened-dynasty",
            expected: "space-marines",
            actual: "necrons",
        });
    });

    it("reports a duplicate rather than double-charging for it", () => {
        const result = validate(["gladius-task-force", "gladius-task-force"]);
        expect(result.valid).toBe(false);
        expect(result.problems).toContainEqual({
            kind: "duplicate",
            slug: "gladius-task-force",
        });
        expect(result.spent).toBe(2);
    });

    it("reports an unknown list size", () => {
        const result = validate(["gladius-task-force"], "apocalypse");
        expect(result.valid).toBe(false);
        expect(result.problems).toContainEqual({
            kind: "unknownListSize",
            listSize: "apocalypse",
        });
    });

    it("collects every problem rather than stopping at the first", () => {
        const result = validate(["no-such-detachment", "awakened-dynasty"]);
        expect(result.problems.map((p) => p.kind).sort()).toEqual([
            "unknownDetachment",
            "wrongFaction",
        ]);
    });
});

describe("validateDetachments — affordability", () => {
    // `affordable` drives the editor's picker, so it answers "what may I add
    // next?" — this faction only, priced, within what is left, not already taken.
    it("offers what still fits after what is already spent", () => {
        const result = validate(["anvil-siege-force"]); // 1 of 3 spent, 2 left
        // gladius costs 2 and fits; black-spear costs 3 and does not; anvil is
        // already selected; awakened-dynasty is Necrons.
        expect(result.affordable).toEqual(["gladius-task-force"]);
    });

    it("offers everything priced and in-faction when nothing is selected", () => {
        expect(validate([]).affordable.sort()).toEqual([
            "anvil-siege-force",
            "black-spear-task-force",
            "gladius-task-force",
        ]);
    });

    it("excludes unpriced detachments, which cannot be budget-checked", () => {
        expect(validate([]).affordable).not.toContain("boarding-strike");
    });

    it("excludes another faction's detachments", () => {
        expect(validate([]).affordable).not.toContain("awakened-dynasty");
    });

    it("narrows to nothing once the budget is exhausted", () => {
        // 2 + 1 = 3 of 3.
        const result = validate(["gladius-task-force", "anvil-siege-force"]);
        expect(result.affordable).toEqual([]);
    });

    it("offers nothing when the list size is unknown", () => {
        expect(validate([], "apocalypse").affordable).toEqual([]);
    });
});
