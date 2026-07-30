import { describe, it, expect } from "vitest";
import {
    transformAbilities,
    extractFactionAbilities,
} from "../transformAbilities";
import type { RawAbility } from "../../types";

describe("transformAbilities — extracted mechanics", () => {
    const datasheetAbility = (description: string) =>
        transformAbilities([
            {
                id: "",
                factionId: "",
                name: "Strafing Run",
                legend: "",
                description,
                type: "Datasheet",
                parameter: "",
            },
        ] as never)[0] as unknown as Record<string, unknown>;

    it("populates mechanics from a parseable description", () => {
        const ability = datasheetAbility(
            "Each time this model makes a ranged attack that targets a unit that cannot Fly, add 1 to the Hit roll.",
        );

        expect(ability.mechanics).toEqual([
            {
                name: "Strafing Run",
                entity: "thisUnit",
                effect: "rollBonus",
                attribute: "hit",
                value: 1,
                phase: ["shooting"],
            },
        ]);
        expect(ability.mechanicsSource).toBe("regex");
    });

    it("leaves mechanics empty and marks it unparsed when nothing matches", () => {
        const ability = datasheetAbility(
            "At the start of the first battle round, select one objective marker on the battlefield.",
        );

        expect(ability.mechanics).toEqual([]);
        expect(ability.mechanicsSource).toBe("unparsed");
    });

    it("does not add mechanics to Core or Faction shells", () => {
        const shell = transformAbilities([
            {
                id: "000008343",
                factionId: "",
                name: "Deep Strike",
                legend: "",
                description: "<p>units have the Deep Strike ability</p>",
                type: "Core",
                parameter: "",
            },
        ] as never)[0] as unknown as Record<string, unknown>;

        expect(shell).not.toHaveProperty("mechanics");
        expect(shell).not.toHaveProperty("mechanicsSource");
    });
});

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
            // Truncated fixture description grants nothing, so nothing extracts.
            mechanics: [],
            mechanicsSource: "unparsed",
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
