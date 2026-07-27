import { describe, it, expect } from "vitest";
import { transformKeywords } from "../transformKeywords";

describe("transformKeywords", () => {
    it("removes datasheetId and casts isFactionKeyword to boolean", () => {
        const result = transformKeywords([
            {
                datasheetId: "000002694",
                keyword: "Tyranids",
                model: "",
                isFactionKeyword: "true",
            },
            {
                datasheetId: "000002694",
                keyword: "Fly",
                model: "",
                isFactionKeyword: "false",
            },
        ]);

        expect(result).toEqual([
            { keyword: "Tyranids", model: "", isFactionKeyword: true },
            { keyword: "Fly", model: "", isFactionKeyword: false },
        ]);
    });

    it("preserves model field", () => {
        const result = transformKeywords([
            {
                datasheetId: "000002694",
                keyword: "Test",
                model: "Specific Model",
                isFactionKeyword: "false",
            },
        ]);
        expect(result[0].model).toBe("Specific Model");
    });
});
