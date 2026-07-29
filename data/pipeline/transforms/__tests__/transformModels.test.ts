import { describe, it, expect } from "vitest";
import { transformModels } from "../transformModels";
import type { RawModel, RawUnitComposition } from "../../types";

describe("transformModels", () => {
    const rawModels: RawModel[] = [
        {
            datasheetId: "000002694",
            line: "1",
            name: "Winged Tyranid Prime",
            m: '12"',
            t: "5",
            sv: "4+",
            invSv: "-",
            invSvDescr: "",
            w: "6",
            ld: "7+",
            oc: "1",
            baseSize: "50mm",
            baseSizeDescr: "",
        },
    ];

    const rawComposition: RawUnitComposition[] = [
        {
            datasheetId: "000002694",
            line: "1",
            description: "1 Winged Tyranid Prime",
        },
    ];

    it("parses all stat strings to numbers", () => {
        const result = transformModels(rawModels, rawComposition);
        const model = result[0];

        expect(model.m).toBe(12);
        expect(model.t).toBe(5);
        expect(model.sv).toBe(4);
        expect(model.invSv).toBeNull();
        expect(model.w).toBe(6);
        expect(model.ld).toBe(7);
        expect(model.oc).toBe(1);
        expect(model.line).toBe(1);
    });

    it("merges unit composition into models", () => {
        const result = transformModels(rawModels, rawComposition);
        expect(result[0].composition).toEqual({ min: 1, max: 1 });
    });

    it("handles range composition (e.g. 3-6)", () => {
        const result = transformModels(rawModels, [
            {
                datasheetId: "000002694",
                line: "1",
                description: "3-6 Winged Tyranid Primes",
            },
        ]);
        expect(result[0].composition).toEqual({ min: 3, max: 6 });
    });

    it("handles invulnerable save with value", () => {
        const result = transformModels(
            [{ ...rawModels[0], invSv: "4+" }],
            rawComposition,
        );
        expect(result[0].invSv).toBe(4);
    });
});
