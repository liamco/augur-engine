import { describe, it, expect } from "vitest";
import {
    transformAbilities,
    extractFactionAbilities,
} from "../transformAbilities";
import type { RawAbility } from "../../types";

describe("extractFactionAbilities", () => {
    const oath = {
        id: "000008350",
        // The source tags Oath of Moment "WE" despite it being Space Marine
        // only — the faction is derived from which datasheets carry it, never
        // from this field.
        factionId: "WE",
        name: "Oath of Moment",
        legend: "Duty and honour...",
        description: "<p>At the start of your Command phase...</p>",
        type: "Faction",
        parameter: "",
    };

    it("extracts a Faction ability with its rules text", () => {
        expect(extractFactionAbilities([oath] as never)).toEqual([
            {
                id: "000008350",
                name: "Oath of Moment",
                type: "Faction",
                legend: "Duty and honour...",
                description: "<p>At the start of your Command phase...</p>",
            },
        ]);
    });

    it("ignores Core abilities, which the library owns by hand", () => {
        expect(
            extractFactionAbilities([
                { ...oath, id: "000008343", name: "Deep Strike", type: "Core" },
            ] as never),
        ).toEqual([]);
    });

    it("ignores bespoke Datasheet abilities, which keep their own description", () => {
        expect(
            extractFactionAbilities([
                { ...oath, id: "", type: "Datasheet", name: "Alpha Warrior" },
            ] as never),
        ).toEqual([]);
    });

    it("ignores a Faction ability with no id to key it by", () => {
        expect(extractFactionAbilities([{ ...oath, id: "" }] as never)).toEqual(
            [],
        );
    });
});

describe("transformAbilities — definition ids", () => {
    it("carries the shared definition id on a Core ability", () => {
        const result = transformAbilities([
            {
                id: "000008343",
                factionId: "",
                name: "Deep Strike",
                legend: "",
                description: "<p>rules text</p>",
                type: "Core",
                parameter: "",
            },
        ] as never);

        expect(result[0]).toEqual({
            id: "000008343",
            name: "Deep Strike",
            type: "Core",
        });
    });

    it("omits the id on a bespoke Datasheet ability, where the source leaves it blank", () => {
        const result = transformAbilities([
            {
                id: "",
                factionId: "",
                name: "Alpha Warrior",
                legend: "",
                description: "<p>rules text</p>",
                type: "Datasheet",
                parameter: "",
            },
        ] as never);

        expect(result[0]).not.toHaveProperty("id");
    });
});

describe("transformAbilities", () => {
    it("converts Core ability to minimal form", () => {
        const raw: RawAbility[] = [
            {
                id: "000008343",
                name: "Deep Strike",
                legend: "Some units...",
                factionId: "",
                description: "<div>...</div>",
                type: "Core",
            },
        ];

        const result = transformAbilities(raw);
        expect(result[0]).toEqual({
            id: "000008343",
            name: "Deep Strike",
            type: "Core",
        });
    });

    it("converts Faction ability to minimal form", () => {
        const raw: RawAbility[] = [
            {
                id: "000000707",
                name: "Shadow in the Warp",
                legend: "...",
                factionId: "TYR",
                description: "...",
                type: "Faction",
            },
        ];

        const result = transformAbilities(raw);
        expect(result[0]).toEqual({
            id: "000000707",
            name: "Shadow in the Warp",
            type: "Faction",
        });
    });

    it("extracts parameter from Core ability name", () => {
        const raw: RawAbility[] = [
            {
                id: "",
                name: "Feel No Pain 5+",
                legend: "",
                factionId: "",
                description: "...",
                type: "Core",
            },
        ];

        const result = transformAbilities(raw);
        expect(result[0]).toEqual({
            name: "Feel No Pain 5+",
            type: "Core",
            parameter: 5,
        });
    });

    it("converts Datasheet ability with full details", () => {
        const raw: RawAbility[] = [
            {
                id: "",
                name: "Alpha Warrior",
                legend: "",
                factionId: "",
                description: "While this model is leading a unit...",
                type: "Datasheet",
                parameter: "",
            },
        ];

        const result = transformAbilities(raw);
        expect(result[0]).toEqual({
            name: "Alpha Warrior",
            legend: "",
            description: "While this model is leading a unit...",
            type: "Datasheet",
            parameter: null,
            mechanics: [],
        });
    });

    it('converts empty parameter to null for Datasheet abilities', () => {
        const raw: RawAbility[] = [
            {
                id: "",
                name: "Test",
                legend: "",
                factionId: "",
                description: "...",
                type: "Datasheet",
                parameter: "",
            },
        ];

        const result = transformAbilities(raw);
        expect((result[0] as { parameter: string | null }).parameter).toBeNull();
    });
});
