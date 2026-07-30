import { describe, it, expect } from "vitest";
import {
    detachmentManifest,
    detachmentsByFaction,
    findDetachment,
    toPlainText,
} from "../detachmentManifest";

describe("toPlainText", () => {
    it("strips the HTML the codex still carries in descriptions", () => {
        expect(
            toPlainText(
                'Each time a <span class="kwb">DESTROYER</span> unit attacks, add 1.',
            ),
        ).toBe("Each time a DESTROYER unit attacks, add 1.");
    });

    it("turns block breaks into spaces rather than joining words", () => {
        expect(toPlainText("First rule.<br><br>Second rule.")).toBe(
            "First rule. Second rule.",
        );
        expect(toPlainText("<div>One</div><div>Two</div>")).toBe("One Two");
    });

    it("decodes the entities that survive the source scrape", () => {
        // &rsquo; becomes a curly apostrophe, matching the ones the codex
        // already stores literally elsewhere.
        expect(toPlainText("Bearer&rsquo;s save &amp; invuln &lt;here&gt;")).toBe(
            "Bearer’s save & invuln <here>",
        );
        expect(toPlainText("a&nbsp;b")).toBe("a b");
    });

    it("leaves plain text untouched", () => {
        expect(toPlainText("Add 1 to the Hit roll.")).toBe("Add 1 to the Hit roll.");
    });
});

describe("detachmentManifest", () => {
    it("covers every detachment in the codex index", () => {
        // Sanity floor, not an exact count — new detachments arrive with the
        // data. A drop to zero means the index import silently broke.
        expect(detachmentManifest.length).toBeGreaterThanOrEqual(69);
    });

    it("gives every detachment an identity and a faction", () => {
        for (const det of detachmentManifest) {
            expect(det.slug).toMatch(/^[a-z0-9-]+$/);
            expect(det.name.length).toBeGreaterThan(0);
            expect(det.faction.slug.length).toBeGreaterThan(0);
        }
    });

    it("has no HTML left in any ability or enhancement description", () => {
        const withMarkup = detachmentManifest.flatMap((det) => [
            ...det.abilities.filter((a) => /<[a-z/]/i.test(a.description)),
            ...det.enhancements.filter((e) => /<[a-z/]/i.test(e.description ?? "")),
        ]);
        expect(withMarkup.map((x) => x.name)).toEqual([]);
    });

    it("keeps slugs unique, since the lab selects by slug", () => {
        const slugs = detachmentManifest.map((d) => `${d.faction.slug}/${d.slug}`);
        expect(new Set(slugs).size).toBe(slugs.length);
    });
});

describe("detachmentsByFaction", () => {
    it("groups without losing or duplicating a detachment", () => {
        const grouped = detachmentsByFaction.flatMap((g) => g.detachments);
        expect(grouped).toHaveLength(detachmentManifest.length);
    });

    it("labels each group with the faction name", () => {
        for (const group of detachmentsByFaction) {
            expect(group.name.length).toBeGreaterThan(0);
            for (const det of group.detachments) {
                expect(det.faction.slug).toBe(group.slug);
            }
        }
    });
});

describe("findDetachment", () => {
    it("resolves a known slug", () => {
        const det = findDetachment("gladius-task-force");
        expect(det?.name).toBe("Gladius Task Force");
        expect(det?.enhancements.length).toBeGreaterThan(0);
    });

    it("returns null for an unknown or empty slug", () => {
        expect(findDetachment("no-such-detachment")).toBeNull();
        expect(findDetachment(null)).toBeNull();
    });
});
