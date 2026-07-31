import { describe, it, expect } from "vitest";
import { computeWeaponEligibility } from "../weaponEligibility";
import { parseAllOptions } from "../parseOptions";

const weapons = [
    { id: "d:bolt-rifle", name: "Bolt rifle" },
    { id: "d:plasma-gun", name: "Plasma gun" },
    { id: "d:power-fist", name: "Power fist" },
    { id: "d:chainsword", name: "Chainsword" },
];

const compute = (
    options: { line: number; description: string }[],
    byModelType: Record<string, string[]>,
) =>
    computeWeaponEligibility({
        weapons,
        defaultLoadoutByModelType: byModelType,
        options: parseAllOptions(options),
    });

describe("computeWeaponEligibility", () => {
    it("marks a weapon every model type starts with as available to any", () => {
        const rules = compute([], {
            Sergeant: ["d:bolt-rifle"],
            Marine: ["d:bolt-rifle"],
        });
        expect(rules.get("d:bolt-rifle")).toEqual([{ type: "any" }]);
    });

    it("restricts a weapon only one model type can take", () => {
        const rules = compute(
            [
                {
                    line: 1,
                    description:
                        "The Sergeant’s chainsword can be replaced with 1 power fist.",
                },
            ],
            { Sergeant: ["d:chainsword"], Marine: ["d:bolt-rifle"] },
        );
        expect(rules.get("d:power-fist")).toEqual([
            { type: "modelType", modelType: ["Sergeant"] },
        ]);
    });

    it("reads a ratio restriction", () => {
        const rules = compute(
            [
                {
                    line: 1,
                    description:
                        "For every 5 models in this unit, 1 model’s bolt rifle can be replaced with 1 plasma gun.",
                },
            ],
            { Marine: ["d:bolt-rifle"] },
        );
        expect(rules.get("d:plasma-gun")).toEqual([
            { type: "ratio", ratio: 5, count: 1 },
        ]);
    });

    it("reads a count cap with a model type", () => {
        const rules = compute(
            [
                {
                    line: 1,
                    description: "Up to 2 Marines can each be equipped with 1 plasma gun.",
                },
            ],
            { Marine: ["d:bolt-rifle"] },
        );
        expect(rules.get("d:plasma-gun")).toEqual([
            { type: "count", count: 2, modelType: ["Marine"] },
        ]);
    });

    it("sums two options that each allow one more of the same weapon", () => {
        // Battle Sisters style: separate bullets each permitting "1 Sister".
        const rules = compute(
            [
                { line: 1, description: "1 Marine can be equipped with 1 plasma gun." },
                { line: 2, description: "1 Marine can be equipped with 1 plasma gun." },
            ],
            { Marine: ["d:bolt-rifle"] },
        );
        // Both bullets name the same model type, so the limit sums and keeps it.
        expect(rules.get("d:plasma-gun")).toEqual([
            { type: "count", count: 2, modelType: ["Marine"] },
        ]);
    });

    it("marks an all-models option as available to any", () => {
        const rules = compute(
            [
                {
                    line: 1,
                    description:
                        "All models in this unit can each be equipped with 1 chainsword.",
                },
            ],
            { Sergeant: ["d:bolt-rifle"], Marine: ["d:bolt-rifle"] },
        );
        expect(rules.get("d:chainsword")).toEqual([{ type: "any" }]);
    });

    it("falls back to any for a weapon no option mentions", () => {
        const rules = compute([], { Marine: ["d:bolt-rifle"] });
        expect(rules.get("d:power-fist")).toEqual([{ type: "any" }]);
    });

    it("gives every weapon a rule", () => {
        const rules = compute([], { Marine: ["d:bolt-rifle"] });
        for (const weapon of weapons) {
            expect(rules.get(weapon.id)?.length).toBeGreaterThan(0);
        }
    });
});
