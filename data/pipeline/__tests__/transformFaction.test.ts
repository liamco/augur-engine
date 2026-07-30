import { describe, it, expect } from "vitest";
import { transformFaction } from "../transformFaction";
import type { RawFaction } from "../types";

const raw = {
    id: "TYR",
    slug: "tyranids",
    name: "Tyranids",
    link: "https://example.test/tyranids",
    dataVersion: "2026-01-14 00:30:31",
    datasheetCount: 55,
    detachmentCount: 12,
    datasheets: [
        {
            id: "000002694",
            slug: "winged-tyranid-prime",
            name: "Winged Tyranid Prime",
            role: "Characters",
            isForgeWorld: false,
            isLegends: false,
        },
    ],
    detachments: [],
} as unknown as RawFaction;

describe("transformFaction", () => {
    it("assembles faction metadata including the source data version", () => {
        const { faction } = transformFaction(raw);

        // datasheets is returned separately as datasheetIndex, so the faction
        // file can be assembled with `abilities` ahead of that long array.
        expect(faction).toEqual({
            id: "TYR",
            slug: "tyranids",
            name: "Tyranids",
            // Records which source snapshot the codex was built from.
            dataVersion: "2026-01-14 00:30:31",
        });
    });

    it("still returns the datasheet index separately", () => {
        const { datasheetIndex } = transformFaction(raw);

        expect(datasheetIndex).toEqual([
            {
                id: "000002694",
                slug: "winged-tyranid-prime",
                name: "Winged Tyranid Prime",
                role: "Characters",
                isForgeWorld: false,
                isLegends: false,
            },
        ]);
    });

    it("omits dataVersion when the source has none", () => {
        const { faction } = transformFaction({
            ...raw,
            dataVersion: undefined,
        } as unknown as RawFaction);

        expect(faction).not.toHaveProperty("dataVersion");
    });
});
