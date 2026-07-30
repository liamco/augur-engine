import { describe, it, expect } from "vitest";
import { slugify } from "../slugify";

describe("slugify", () => {
    it("lowercases and joins words with dashes", () => {
        expect(slugify("Gladius Task Force")).toBe("gladius-task-force");
    });

    it("drops a curly apostrophe instead of turning it into a dash", () => {
        expect(slugify("Lion’s Blade Task Force")).toBe(
            "lions-blade-task-force",
        );
        expect(slugify("Emperor’s Shield")).toBe("emperors-shield");
    });

    it("drops a straight apostrophe the same way", () => {
        expect(slugify("Lion's Blade Task Force")).toBe(
            "lions-blade-task-force",
        );
    });

    it("keeps a hyphen that is already part of the name", () => {
        expect(slugify("Rage-cursed Onslaught")).toBe("rage-cursed-onslaught");
    });

    it("collapses runs of separators and trims them from the ends", () => {
        expect(slugify("  Hammer   of  Avernii  ")).toBe("hammer-of-avernii");
        expect(slugify("Anvil — Siege Force")).toBe("anvil-siege-force");
    });
});
