import { describe, it, expect } from "vitest";
import { transformCosts } from "../transformCosts";

describe("transformCosts", () => {
    it("parses cost string to number and extracts count", () => {
        const result = transformCosts([
            {
                datasheetId: "000002694",
                line: "1",
                description: "1 model",
                cost: "65",
            },
        ]);

        expect(result).toEqual([{ cost: 65, count: 1 }]);
    });

    it("handles multi-model cost entries", () => {
        const result = transformCosts([
            {
                datasheetId: "000002694",
                line: "1",
                description: "3 models",
                cost: "120",
            },
            {
                datasheetId: "000002694",
                line: "2",
                description: "6 models",
                cost: "240",
            },
        ]);

        expect(result).toEqual([
            { cost: 120, count: 3 },
            { cost: 240, count: 6 },
        ]);
    });
});
