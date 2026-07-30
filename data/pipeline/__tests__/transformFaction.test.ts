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

        expect(faction).toEqual({
            id: "TYR",
            slug: "tyranids",
            name: "Tyranids",
            // Records which source snapshot the codex was built from.
            dataVersion: "2026-01-14 00:30:31",
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
        });
    });

    it("omits dataVersion when the source has none", () => {
        const { faction } = transformFaction({
            ...raw,
            dataVersion: undefined,
        } as unknown as RawFaction);

        expect(faction).not.toHaveProperty("dataVersion");
    });
});
