import { describe, it, expect } from "vitest";
import { factionCatalogue, findFaction } from "../factionCatalogue";
import { detachmentCatalogue } from "../detachmentCatalogue";

describe("factionCatalogue", () => {
    it("covers the factions in the codex", () => {
        expect(factionCatalogue.map((f) => f.slug)).toEqual([
            "necrons",
            "space-marines",
            "tyranids",
        ]);
    });

    it("carries a dataVersion, which is what a list records", () => {
        for (const faction of factionCatalogue) {
            expect(faction.dataVersion).toMatch(/\d{4}-\d{2}-\d{2}/);
        }
    });

    it("uses slugs that match the detachment catalogue", () => {
        // Otherwise a list's faction could never be matched against its
        // detachments and the picker would come up empty.
        const detachmentFactions = new Set(
            detachmentCatalogue.map((d) => d.factionSlug),
        );
        for (const faction of factionCatalogue) {
            expect(detachmentFactions.has(faction.slug)).toBe(true);
        }
    });
});

describe("findFaction", () => {
    it("finds by slug", () => {
        expect(findFaction("space-marines")?.name).toBe("Space Marines");
    });

    it("returns null for an unknown slug", () => {
        expect(findFaction("orks")).toBeNull();
    });
});
