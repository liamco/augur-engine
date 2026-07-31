import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Corpus guard over every parsed wargear loadout in the codex.
 *
 * The engine and UI read these ids directly, so a reference to a weapon the
 * datasheet does not list is worse than no loadout at all — the previous
 * implementation put 96 such ids across 56 datasheets into its output, 68 of
 * which still claimed to have parsed successfully.
 *
 * Mirrors data/pipeline/__tests__/weaponAttributeVocabulary.test.ts.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const FACTIONS = join(ROOT, "app/codex/factions");

interface Datasheet {
    id: string;
    name: string;
    unitComposition?: { description: string }[];
    wargear: {
        defaultLoadout: { raw: string; parsed: string[]; byModelType: Record<string, string[]> };
        weapons: { id: string; name: string; eligibility: { type: string }[] }[];
        abilities: { id: string; name: string; mechanics: unknown[]; mechanicsSource: string }[];
        options: { raw: { description: string }[] };
        validLoadouts: { modelType: string; items: string[][] }[];
        loadoutsParsed: boolean;
    };
}

const datasheets: Datasheet[] = [];
for (const faction of readdirSync(FACTIONS, { withFileTypes: true })) {
    if (!faction.isDirectory()) continue;
    const dir = join(FACTIONS, faction.name, "datasheets");
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
        if (!file.endsWith(".json")) continue;
        datasheets.push(JSON.parse(readFileSync(join(dir, file), "utf-8")));
    }
}

/**
 * Everything a loadout may legitimately name: weapons *and* wargear-conferred
 * abilities. A loadout saying "equipped with 1 storm shield" resolves to an
 * ability id, so checking only weapons would flag those as dangling.
 */
const idsOf = (d: Datasheet) =>
    new Set([
        ...d.wargear.weapons.map((w) => w.id),
        ...(d.wargear.abilities ?? []).map((a) => a.id),
    ]);

describe("wargear loadouts (whole corpus)", () => {
    it("read the codex", () => {
        expect(datasheets.length).toBeGreaterThan(400);
    });

    it("never references wargear the datasheet does not list", () => {
        const dangling: string[] = [];
        for (const d of datasheets) {
            const valid = idsOf(d);
            const referenced = [
                ...d.wargear.defaultLoadout.parsed,
                ...Object.values(d.wargear.defaultLoadout.byModelType).flat(),
                ...d.wargear.validLoadouts.flatMap((g) => g.items.flat()),
            ];
            for (const id of referenced) {
                if (!valid.has(id)) dangling.push(`${d.name}: ${id}`);
            }
        }
        expect(dangling).toEqual([]);
    });

    it("only claims loadoutsParsed when it produced combinations", () => {
        const lying = datasheets
            .filter((d) => d.wargear.loadoutsParsed)
            .filter((d) => d.wargear.validLoadouts.length === 0)
            .map((d) => d.name);
        expect(lying).toEqual([]);
    });

    it("gives every weapon at least one eligibility rule", () => {
        const missing = datasheets
            .flatMap((d) => d.wargear.weapons.map((w) => ({ d, w })))
            .filter(({ w }) => !w.eligibility || w.eligibility.length === 0)
            .map(({ d, w }) => `${d.name}: ${w.id}`);
        expect(missing).toEqual([]);
    });

    it("uses only the four known eligibility rule types", () => {
        const known = new Set(["any", "modelType", "ratio", "count"]);
        const unknown = new Set<string>();
        for (const d of datasheets) {
            for (const w of d.wargear.weapons) {
                for (const rule of w.eligibility) {
                    if (!known.has(rule.type)) unknown.add(rule.type);
                }
            }
        }
        expect([...unknown]).toEqual([]);
    });

    it("never lists the same combination twice within a group", () => {
        const dupes: string[] = [];
        for (const d of datasheets) {
            for (const group of d.wargear.validLoadouts) {
                const keys = group.items.map((c) => [...c].sort().join("|"));
                if (new Set(keys).size !== keys.length) {
                    dupes.push(`${d.name} / ${group.modelType}`);
                }
            }
        }
        expect(dupes).toEqual([]);
    });

    it("holds loadout coverage at or above the measured floor", () => {
        const withOptions = datasheets.filter((d) =>
            d.wargear.options.raw.some((o) => {
                const t = o.description.trim().toLowerCase();
                return t !== "none" && t !== "none." && !t.startsWith("*");
            }),
        );
        const parsed = withOptions.filter((d) => d.wargear.loadoutsParsed);
        // Measured at 148/227. A drop means a pattern regressed; a rise is
        // welcome and should move this floor up.
        expect(withOptions.length).toBeGreaterThanOrEqual(220);
        expect(parsed.length).toBeGreaterThanOrEqual(148);
    });

    it("gives every wargear ability an id, a name and a source", () => {
        const bad: string[] = [];
        for (const d of datasheets) {
            for (const a of d.wargear.abilities ?? []) {
                if (!a.id.startsWith(`${d.id}:`)) bad.push(`${d.name}: bad id ${a.id}`);
                if (!a.name) bad.push(`${d.name}: nameless wargear ability`);
                if (!a.mechanicsSource) bad.push(`${d.name}: ${a.id} has no source`);
            }
        }
        expect(bad).toEqual([]);
    });

    it("keeps Wargear-typed abilities out of the main abilities list", () => {
        // They live on wargear.abilities; duplicating them as "Datasheet" both
        // double-counted coverage and applied a one-model item to the whole unit.
        const leaked = datasheets
            .filter((d) =>
                ((d as unknown as { abilities?: { type?: string }[] }).abilities ?? []).some(
                    (a) => a.type === "Wargear",
                ),
            )
            .map((d) => d.name);
        expect(leaked).toEqual([]);
    });

    it("holds default-loadout coverage at or above the measured floor", () => {
        const resolved = datasheets.filter(
            (d) => d.wargear.defaultLoadout.parsed.length > 0,
        );
        // Measured at 393 of 416 with a loadout string.
        expect(resolved.length).toBeGreaterThanOrEqual(390);
    });
});
