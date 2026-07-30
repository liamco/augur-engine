import { describe, it, expect } from "vitest";
import {
    summariseEligibility,
    createEligibilityIndex,
    recordDatasheetEligibility,
    applyEligibility,
} from "../eligibility";
import type { ParsedDetachment, RawDatasheet } from "../../types";

const universe = ["d1", "d2", "d3", "d4"];

describe("summariseEligibility", () => {
    it("collapses to 'all' when every datasheet is eligible", () => {
        expect(summariseEligibility(new Set(universe), universe)).toBe("all");
    });

    it("lists includes when the eligible side is smaller", () => {
        expect(summariseEligibility(new Set(["d3", "d1"]), universe)).toEqual({
            include: ["d1", "d3"],
        });
    });

    it("lists excludes when the ineligible side is smaller", () => {
        expect(
            summariseEligibility(new Set(["d1", "d2", "d3"]), universe),
        ).toEqual({ exclude: ["d4"] });
    });

    it("represents nothing-eligible as an empty include", () => {
        expect(summariseEligibility(new Set(), universe)).toEqual({
            include: [],
        });
    });
});

// Two datasheets that share a detachment but list different subsets of its
// stratagems — the case that makes per-entity eligibility necessary (8930 of
// 11648 datasheet x detachment pairs in the source are partial like this).
const sheetA = {
    id: "d1",
    stratagems: [
        { id: "s1", detachmentId: "det1" },
        { id: "s2", detachmentId: "det1" },
    ],
    enhancements: [{ id: "e1", detachmentId: "det1" }],
    detachmentAbilities: [{ id: "a1", detachmentId: "det1" }],
} as unknown as RawDatasheet;

const sheetB = {
    id: "d2",
    stratagems: [{ id: "s1", detachmentId: "det1" }],
    enhancements: [],
    detachmentAbilities: [{ id: "a1", detachmentId: "det1" }],
} as unknown as RawDatasheet;

describe("eligibility index", () => {
    it("records each datasheet against the entities it lists", () => {
        const index = createEligibilityIndex();
        recordDatasheetEligibility(index, sheetA);
        recordDatasheetEligibility(index, sheetB);

        expect(index.datasheetIds).toEqual(["d1", "d2"]);
        expect(index.byStratagem.get("s1")).toEqual(new Set(["d1", "d2"]));
        expect(index.byStratagem.get("s2")).toEqual(new Set(["d1"]));
        expect(index.byEnhancement.get("e1")).toEqual(new Set(["d1"]));
        expect(index.byDetachmentAbility.get("a1")).toEqual(
            new Set(["d1", "d2"]),
        );
    });

    it("ignores null entries in the source arrays", () => {
        const index = createEligibilityIndex();
        recordDatasheetEligibility(index, {
            id: "d1",
            stratagems: [null, { id: "s1", detachmentId: "det1" }],
            enhancements: null,
            detachmentAbilities: undefined,
        } as unknown as RawDatasheet);

        expect(index.byStratagem.get("s1")).toEqual(new Set(["d1"]));
    });
});

describe("applyEligibility", () => {
    const detachments = [
        {
            name: "Det One",
            slug: "det-one",
            abilities: [{ id: "a1", name: "A", description: "", legend: "" }],
            stratagems: [
                { id: "s1", name: "S1" },
                { id: "s2", name: "S2" },
            ],
            enhancements: [{ id: "e1", name: "E1" }],
        },
    ] as unknown as ParsedDetachment[];

    it("annotates each entity from the index", () => {
        const index = createEligibilityIndex();
        recordDatasheetEligibility(index, sheetA);
        recordDatasheetEligibility(index, sheetB);

        const [det] = applyEligibility(detachments, index);

        expect(det.abilities[0].eligibleDatasheets).toBe("all");
        expect(det.stratagems[0].eligibleDatasheets).toBe("all");
        expect(det.stratagems[1].eligibleDatasheets).toEqual({
            include: ["d1"],
        });
        expect(det.enhancements[0].eligibleDatasheets).toEqual({
            include: ["d1"],
        });
    });

    it("sets detachment eligibility to the union of its own entities", () => {
        const index = createEligibilityIndex();
        recordDatasheetEligibility(index, sheetA);
        recordDatasheetEligibility(index, sheetB);

        const [det] = applyEligibility(detachments, index);

        // d1 via s2/e1, d2 via s1 — union is everything.
        expect(det.eligibleDatasheets).toBe("all");
    });

    it("narrows detachment eligibility when only some datasheets list it", () => {
        const index = createEligibilityIndex();
        recordDatasheetEligibility(index, sheetA);
        recordDatasheetEligibility(index, {
            id: "d2",
            stratagems: [],
            enhancements: [],
            detachmentAbilities: [],
        } as unknown as RawDatasheet);

        const [det] = applyEligibility(detachments, index);

        expect(det.eligibleDatasheets).toEqual({ include: ["d1"] });
    });

    it("marks an entity no datasheet lists as eligible for none", () => {
        const index = createEligibilityIndex();
        recordDatasheetEligibility(index, sheetB);

        const [det] = applyEligibility(detachments, index);

        expect(det.stratagems[1].eligibleDatasheets).toEqual({ include: [] });
    });
});
