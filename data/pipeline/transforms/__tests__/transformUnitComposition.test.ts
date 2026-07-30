import { describe, it, expect } from "vitest";
import { transformUnitComposition } from "../transformUnitComposition";
import type { RawUnitComposition } from "../../types";

const raw = (
    line: string,
    description: string,
): RawUnitComposition => ({ datasheetId: "000000068", line, description });

describe("transformUnitComposition", () => {
    it("parses a fixed count and drops datasheetId", () => {
        const result = transformUnitComposition([
            raw("1", "1 Suppressor Sergeant"),
        ]);

        expect(result).toEqual([
            {
                line: 1,
                description: "1 Suppressor Sergeant",
                min: 1,
                max: 1,
            },
        ]);
    });

    it("parses a hyphenated range as min and max", () => {
        const result = transformUnitComposition([
            raw("2", "4-9 Infernus Marines"),
        ]);

        expect(result[0]).toMatchObject({ min: 4, max: 9 });
    });

    it("parses a range written with a non-breaking hyphen", () => {
        const result = transformUnitComposition([
            raw("2", "2‑9 Kill Team Intercessors with Jump Packs"),
        ]);

        expect(result[0]).toMatchObject({ min: 2, max: 9 });
    });

    it("strips inline HTML from the description", () => {
        const result = transformUnitComposition([
            raw(
                "1",
                '1 Marneus Calgar – <span class="kwb">EPIC</span> <span class="kwb">HERO</span>',
            ),
        ]);

        expect(result[0].description).toBe("1 Marneus Calgar – EPIC HERO");
        expect(result[0]).toMatchObject({ min: 1, max: 1 });
    });

    it("keeps a named-model list readable when stripping block HTML", () => {
        const result = transformUnitComposition([
            raw(
                "2",
                "8 Kill Team Veterans:<br><ul><li>Vael Donatus</li><li>Zameon Gydrael</li></ul>",
            ),
        ]);

        expect(result[0].description).toBe(
            "8 Kill Team Veterans: Vael Donatus Zameon Gydrael",
        );
        expect(result[0]).toMatchObject({ min: 8, max: 8 });
    });

    it("gives a countless separator line a zero count", () => {
        const result = transformUnitComposition([raw("4", "OR")]);

        expect(result[0]).toEqual({
            line: 4,
            description: "OR",
            min: 0,
            max: 0,
        });
    });

    it("only reads a count anchored at the start of the description", () => {
        const result = transformUnitComposition([
            raw("3", "1 Kill Team Terminator (Garran Branatar)"),
        ]);

        expect(result[0]).toMatchObject({ min: 1, max: 1 });
    });
});
