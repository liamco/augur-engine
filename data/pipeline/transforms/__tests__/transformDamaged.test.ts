import { describe, it, expect } from "vitest";
import { transformDamaged } from "../transformDamaged";

describe("transformDamaged", () => {
    it("returns null when both damagedW and damagedDescription are empty", () => {
        expect(transformDamaged("", "")).toBeNull();
    });

    it("returns null when damagedW is empty", () => {
        expect(transformDamaged("", "some description")).toBeNull();
    });

    it("parses range format like 1-5", () => {
        const result = transformDamaged(
            "1-5",
            "While this model has 1-5 wounds remaining...",
        );
        expect(result).toEqual({
            range: "1-5",
            threshold: 5,
            description: "While this model has 1-5 wounds remaining...",
            mechanics: [],
        });
    });

    it("parses single number as range", () => {
        const result = transformDamaged("5", "Some description");
        expect(result).toEqual({
            range: "1-5",
            threshold: 5,
            description: "Some description",
            mechanics: [],
        });
    });

    it("strips HTML from description", () => {
        const result = transformDamaged(
            "1-5",
            '<b>While</b> this <span class="kwb">model</span> has 1-5 wounds remaining',
        );
        expect(result!.description).toBe(
            "While this model has 1-5 wounds remaining",
        );
    });
});
