import { describe, it, expect } from "vitest";
import { groupWargearProfiles } from "./wargear";
import type { DatasheetWargear } from "../types/wahapedia";

/**
 * Guards the multi-profile weapon merge.
 *
 * Wahapedia flattens a weapon's profiles into separate rows, distinguished by a
 * "<base> – <profile>" name and an incrementing lineInWargear. Grouping them back
 * into one weapon is what lets a loadout option naming "1 macro plasma
 * incinerator" resolve to a single weapon id.
 */
const row = (
    line: number,
    lineInWargear: number,
    name: string,
): DatasheetWargear =>
    ({
        datasheetId: "000002717",
        line: String(line),
        lineInWargear: String(lineInWargear),
        name,
        type: "Ranged",
        range: "36",
        a: "D6+1",
        bsWs: "3",
        s: "8",
        ap: "-3",
        d: "2",
        description: "blast",
        dice: "",
    }) as unknown as DatasheetWargear;

const group = (rows: DatasheetWargear[]) =>
    groupWargearProfiles(rows, {
        createId: ({ baseName, groupIndex }) =>
            `000002717:${(baseName || `wargear-${groupIndex + 1}`)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}`,
    });

describe("groupWargearProfiles", () => {
    it("merges profiles separated by an en dash, which is what the source uses", () => {
        // U+2013. This is the real separator in every Wahapedia row and the one
        // the separator list previously failed to match.
        const grouped = group([
            row(4, 1, "Macro plasma incinerator – standard"),
            row(5, 2, "Macro plasma incinerator – supercharge"),
        ]);

        expect(grouped).toHaveLength(1);
        expect(grouped[0].name).toBe("Macro plasma incinerator");
        expect(grouped[0].id).toBe("000002717:macro-plasma-incinerator");
        expect(grouped[0].profiles).toHaveLength(2);
    });

    it("records each profile's own name and sub-profile label", () => {
        const [weapon] = group([
            row(4, 1, "Macro plasma incinerator – standard"),
            row(5, 2, "Macro plasma incinerator – supercharge"),
        ]);

        expect(weapon.profiles.map((p) => p.profileName)).toEqual([
            "standard",
            "supercharge",
        ]);
    });

    it("merges an em dash separator too", () => {
        const grouped = group([
            row(1, 1, "Kranak grenades — frag"),
            row(2, 2, "Kranak grenades — krak"),
        ]);
        expect(grouped).toHaveLength(1);
        expect(grouped[0].name).toBe("Kranak grenades");
    });

    it("merges a plain hyphen separator", () => {
        const grouped = group([
            row(1, 1, "Bolt rifle - standard"),
            row(2, 2, "Bolt rifle - overcharge"),
        ]);
        expect(grouped).toHaveLength(1);
        expect(grouped[0].name).toBe("Bolt rifle");
    });

    it("keeps distinct weapons apart", () => {
        const grouped = group([
            row(1, 1, "Heavy flamer"),
            row(2, 1, "Heavy onslaught gatling cannon"),
        ]);
        expect(grouped).toHaveLength(2);
        expect(grouped.map((w) => w.name)).toEqual([
            "Heavy flamer",
            "Heavy onslaught gatling cannon",
        ]);
    });

    it("does not merge same-named rows that both start a group", () => {
        // lineInWargear 1 means "first profile of a weapon", so two of them are
        // two weapons however similar the names.
        const grouped = group([
            row(1, 1, "Bolt pistol – standard"),
            row(2, 1, "Bolt pistol – standard"),
        ]);
        expect(grouped).toHaveLength(2);
    });

    it("leaves a hyphenated weapon name alone when there is no space around it", () => {
        // "Twin-linked" style names must not be split into base + profile.
        const grouped = group([row(1, 1, "Twin-linked heavy bolter")]);
        expect(grouped).toHaveLength(1);
        expect(grouped[0].name).toBe("Twin-linked heavy bolter");
        expect(grouped[0].profiles[0].profileName).toBeUndefined();
    });

    it("returns nothing for no rows", () => {
        expect(group([])).toEqual([]);
    });
});
