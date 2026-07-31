import { describe, it, expect } from "vitest";
import { detachmentCatalogue } from "../detachmentCatalogue";
import { validateDetachments } from "../validateDetachments";
import { listSizes } from "../listSizes";

/**
 * The pure validator against the real codex, rather than fixtures.
 *
 * Guards the numbers the plan was built on, so a data refresh that changes them
 * is visible rather than silently shifting what a player can field.
 */
describe("detachmentCatalogue", () => {
    it("covers every detachment in the codex index", () => {
        expect(detachmentCatalogue.length).toBeGreaterThanOrEqual(69);
    });

    it("carries the faction, so a list cannot take another faction's detachment", () => {
        for (const entry of detachmentCatalogue) {
            expect(entry.factionSlug).toMatch(/^[a-z-]+$/);
            expect(entry.slug).toMatch(/^[a-z0-9-]+$/);
        }
    });

    it("still has exactly the 12 unpriced detachments the plan accounted for", () => {
        // No plugins.json entry, so no detachmentPoints. If this drops, someone
        // filled them in and the editor can stop refusing them.
        const unpriced = detachmentCatalogue.filter(
            (d) => d.detachmentPoints == null,
        );
        expect(unpriced).toHaveLength(12);
        expect(unpriced.map((d) => d.slug)).toContain("boarding-strike");
    });
});

describe("real affordability by battle size", () => {
    const affordableAlone = (listSize: string, factionSlug: string) =>
        validateDetachments({
            slugs: [],
            listSize,
            factionSlug,
            catalogue: detachmentCatalogue,
        }).affordable;

    it("puts every 3-point detachment out of reach at incursion", () => {
        const budget = listSizes.find((s) => s.name === "incursion")!
            .detachmentPointBudget;
        expect(budget).toBe(2);

        const offered = new Set(affordableAlone("incursion", "space-marines"));
        const threePoint = detachmentCatalogue.filter(
            (d) => d.factionSlug === "space-marines" && d.detachmentPoints === 3,
        );
        expect(threePoint.length).toBeGreaterThan(0);
        for (const d of threePoint) expect(offered.has(d.slug)).toBe(false);
    });

    it("offers 3-point detachments at strike-force", () => {
        const offered = new Set(affordableAlone("strike-force", "space-marines"));
        const threePoint = detachmentCatalogue.filter(
            (d) => d.factionSlug === "space-marines" && d.detachmentPoints === 3,
        );
        for (const d of threePoint) expect(offered.has(d.slug)).toBe(true);
    });

    it("holds the measured totals across all factions", () => {
        // Measured while planning: 42 of 69 affordable alone at incursion,
        // 57 at strike-force and onslaught.
        const factions = [...new Set(detachmentCatalogue.map((d) => d.factionSlug))];
        const total = (listSize: string) =>
            factions.reduce(
                (n, faction) => n + affordableAlone(listSize, faction).length,
                0,
            );

        expect(total("incursion")).toBe(42);
        expect(total("strike-force")).toBe(57);
        expect(total("onslaught")).toBe(57);
    });

    it("never offers a detachment from a different faction", () => {
        for (const faction of ["space-marines", "necrons", "tyranids"]) {
            for (const slug of affordableAlone("strike-force", faction)) {
                const entry = detachmentCatalogue.find((d) => d.slug === slug)!;
                expect(entry.factionSlug).toBe(faction);
            }
        }
    });
});
