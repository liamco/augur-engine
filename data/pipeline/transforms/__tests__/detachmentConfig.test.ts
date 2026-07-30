import { describe, it, expect } from "vitest";
import {
    applyDetachmentConfig,
    loadDetachmentConfig,
    type DetachmentConfigEntry,
} from "../detachmentConfig";
import type { ParsedDetachment } from "../../types";

const detachment = (slug: string): ParsedDetachment =>
    ({
        id: "000000001",
        slug,
        name: slug,
        abilities: [],
        stratagems: [],
        enhancements: [],
    }) as ParsedDetachment;

const entry = (over: Partial<DetachmentConfigEntry> = {}): DetachmentConfigEntry => ({
    name: "Gladius Task Force",
    supplement: "codex",
    detachmentPoints: 3,
    disposition: "Priority Assets",
    ...over,
});

describe("applyDetachmentConfig", () => {
    it("stamps supplement, points and disposition onto a matching detachment", () => {
        const { detachments } = applyDetachmentConfig(
            [detachment("gladius-task-force")],
            new Map([["gladius-task-force", entry()]]),
        );

        expect(detachments[0]).toMatchObject({
            slug: "gladius-task-force",
            supplement: "codex",
            detachmentPoints: 3,
            // Emitted as the library's slug, not the config's title case.
            disposition: "priority-assets",
        });
    });

    it("converts every title-case disposition to its library slug", () => {
        const cases: [string, string][] = [
            ["Disruption", "disruption"],
            ["Reconnaissance", "reconnaissance"],
            ["Priority Assets", "priority-assets"],
            ["Take and Hold", "take-and-hold"],
            ["Purge the Foe", "purge-the-foe"],
        ];

        for (const [titleCase, slug] of cases) {
            const { detachments } = applyDetachmentConfig(
                [detachment("d")],
                new Map([["d", entry({ disposition: titleCase })]]),
            );
            expect(detachments[0].disposition).toBe(slug);
        }
    });

    it("throws on a disposition the library does not list", () => {
        expect(() =>
            applyDetachmentConfig(
                [detachment("d")],
                new Map([["d", entry({ disposition: "Sieze Ground" })]]),
            ),
        ).toThrow(/Sieze Ground/);
    });

    it("carries a null disposition and points through without slugifying", () => {
        const { detachments } = applyDetachmentConfig(
            [detachment("terminator-assault")],
            new Map([
                [
                    "terminator-assault",
                    entry({ detachmentPoints: null, disposition: null }),
                ],
            ]),
        );

        expect(detachments[0]).toMatchObject({
            detachmentPoints: null,
            disposition: null,
        });
    });

    it("leaves an unconfigured detachment untouched and reports it", () => {
        const { detachments, unconfigured } = applyDetachmentConfig(
            [detachment("invasion-fleet")],
            new Map(),
        );

        expect(detachments[0]).not.toHaveProperty("supplement");
        expect(detachments[0]).not.toHaveProperty("detachmentPoints");
        expect(detachments[0]).not.toHaveProperty("disposition");
        expect(unconfigured).toEqual(["invasion-fleet"]);
    });

    it("reports a config entry that has no detachment", () => {
        const { unmatchedConfig } = applyDetachmentConfig(
            [detachment("gladius-task-force")],
            new Map([
                ["gladius-task-force", entry()],
                ["dark-age-arsenal", entry({ supplement: "dark-angels" })],
            ]),
        );

        expect(unmatchedConfig).toEqual(["dark-age-arsenal"]);
    });
});

describe("loadDetachmentConfig", () => {
    it("returns an empty map for a faction with no config file", () => {
        expect(loadDetachmentConfig("data/pipeline/does-not-exist").size).toBe(0);
    });

    it("loads the real space-marines config", () => {
        const config = loadDetachmentConfig("app/codex/factions/space-marines");

        expect(config.size).toBeGreaterThan(50);
        expect(config.get("gladius-task-force")).toEqual({
            name: "Gladius Task Force",
            supplement: "codex",
            detachmentPoints: 3,
            disposition: "Priority Assets",
        });
    });
});
