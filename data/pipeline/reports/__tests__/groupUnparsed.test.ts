import { describe, it, expect } from "vitest";
import { groupUnparsed, summarise, type RuleRecord } from "../groupUnparsed";

const rule = (
    name: string,
    description: string,
    owner: string,
    source = "unparsed",
): RuleRecord => ({ name, description, owner, mechanicsSource: source, hasMechanics: false });

describe("summarise", () => {
    it("counts by source and reports coverage", () => {
        const result = summarise([
            { ...rule("A", "x", "o"), mechanicsSource: "regex", hasMechanics: true },
            rule("B", "y", "o"),
            rule("C", "z", "o", "needsSchema"),
        ]);
        expect(result).toEqual({
            total: 3,
            withMechanics: 1,
            coverage: 33,
            bySource: { regex: 1, unparsed: 1, needsSchema: 1 },
        });
    });

    it("reports zero coverage without dividing by zero", () => {
        expect(summarise([])).toEqual({
            total: 0,
            withMechanics: 0,
            coverage: 0,
            bySource: {},
        });
    });
});

describe("groupUnparsed", () => {
    it("collapses identical rules text into one entry with its owners", () => {
        // The same ability appears on many datasheets; the skill should see it
        // once, with every place it needs editing.
        const groups = groupUnparsed([
            rule("Storm Shield", "The bearer has a 4+ invulnerable save.", "Wolf Guard"),
            rule("Storm Shield", "The bearer has a 4+ invulnerable save.", "Vanguard Veterans"),
        ]);
        expect(groups).toHaveLength(1);
        expect(groups[0]).toMatchObject({
            name: "Storm Shield",
            description: "The bearer has a 4+ invulnerable save.",
            count: 2,
            owners: ["Vanguard Veterans", "Wolf Guard"],
        });
    });

    it("keeps same-named rules with different text apart", () => {
        const groups = groupUnparsed([
            rule("Aura", "Add 1 to the Hit roll.", "A"),
            rule("Aura", "Add 1 to the Wound roll.", "B"),
        ]);
        expect(groups).toHaveLength(2);
    });

    it("orders by how many places share the text, then by name", () => {
        const groups = groupUnparsed([
            rule("Rare", "only here", "A"),
            rule("Common", "everywhere", "A"),
            rule("Common", "everywhere", "B"),
            rule("Common", "everywhere", "C"),
        ]);
        expect(groups.map((g) => g.name)).toEqual(["Common", "Rare"]);
    });

    it("ignores anything that already has mechanics", () => {
        const groups = groupUnparsed([
            { ...rule("Done", "x", "A"), hasMechanics: true, mechanicsSource: "regex" },
            rule("Todo", "y", "A"),
        ]);
        expect(groups.map((g) => g.name)).toEqual(["Todo"]);
    });

    it("keeps a triaged verdict visible rather than dropping it", () => {
        // outOfScope and needsSchema are decisions already made — worth showing
        // so the same rule is not re-triaged every time.
        const groups = groupUnparsed([rule("Warlord", "Cannot be your Warlord.", "A", "outOfScope")]);
        expect(groups[0].mechanicsSource).toBe("outOfScope");
    });

    it("lists each owner once even if it appears twice", () => {
        const groups = groupUnparsed([
            rule("Twin", "same text", "A"),
            rule("Twin", "same text", "A"),
        ]);
        expect(groups[0].owners).toEqual(["A"]);
        expect(groups[0].count).toBe(2);
    });

    it("treats an empty description as its own group rather than merging them", () => {
        const groups = groupUnparsed([rule("A", "", "x"), rule("B", "", "y")]);
        expect(groups).toHaveLength(2);
    });
});
