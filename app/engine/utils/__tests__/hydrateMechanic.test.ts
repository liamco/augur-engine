import { describe, it, expect } from "vitest";
import { hydrateMechanic } from "../hydrateMechanic";
import { Mechanic } from "@/app/types/Mechanic";

// Template fixtures matching the library JSON files

const antiTemplate: Mechanic = {
    name: "Anti",
    entity: "thisModel",
    effect: "criticalWound",
    attribute: "wound",
    value: "$param",
    conditions: [
        {
            entity: "targetUnit",
            keywords: ["$keyword"],
            operator: "includes",
            value: "$keyword",
        },
    ],
};

const sustainedHitsTemplate: Mechanic = {
    name: "sustained-hits",
    entity: "thisModel",
    effect: "extraSuccess",
    attribute: "hit",
    value: "$param",
    conditions: [
        {
            entity: "diceRoll",
            attribute: "hit",
            operator: "greaterThanOrEqualTo",
            value: "$critical",
        },
    ],
};

const meltaTemplate: Mechanic = {
    name: "melta",
    entity: "thisModel",
    effect: "rollBonus",
    attribute: "damage",
    value: "$param",
    conditions: [
        {
            entity: "targetUnit",
            attribute: "range",
            operator: "lessThanOrEqualTo",
            value: "$halfRange",
        },
    ],
};

const torrentTemplate: Mechanic = {
    name: "Torrent",
    entity: "thisModel",
    effect: "autoSuccess",
    attribute: "hit",
    value: true,
};

describe("hydrateMechanic", () => {
    it("replaces $param in top-level value", () => {
        const result = hydrateMechanic(sustainedHitsTemplate, {
            key: "sustained-hits",
            param: 2,
        });
        expect(result.value).toBe(2);
    });

    it("replaces $critical with 6 in conditions", () => {
        const result = hydrateMechanic(sustainedHitsTemplate, {
            key: "sustained-hits",
            param: 1,
        });
        expect(result.conditions![0].value).toBe(6);
    });

    it("replaces $keyword in condition value and keywords array", () => {
        const result = hydrateMechanic(antiTemplate, {
            key: "anti",
            param: 4,
            keyword: "INFANTRY",
        });
        expect(result.value).toBe(4);
        expect(result.conditions![0].value).toBe("INFANTRY");
        expect(result.conditions![0].keywords).toEqual(["INFANTRY"]);
    });

    it("replaces $halfRange when option provided", () => {
        const result = hydrateMechanic(
            meltaTemplate,
            { key: "melta", param: 2 },
            { halfRange: 12 },
        );
        expect(result.value).toBe(2);
        expect(result.conditions![0].value).toBe(12);
    });

    it("does not mutate the original template", () => {
        const originalValue = antiTemplate.value;
        const originalConditionValue = antiTemplate.conditions![0].value;

        hydrateMechanic(antiTemplate, {
            key: "anti",
            param: 4,
            keyword: "PSYKER",
        });

        expect(antiTemplate.value).toBe(originalValue);
        expect(antiTemplate.conditions![0].value).toBe(originalConditionValue);
    });

    it("returns mechanic unchanged when no placeholders present", () => {
        const result = hydrateMechanic(torrentTemplate, { key: "torrent" });
        expect(result).toEqual(torrentTemplate);
    });
});
