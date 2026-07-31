import { describe, it, expect } from "vitest";
import { parseListInput } from "../parseListInput";

const valid = {
    name: "Gladius test",
    factionSlug: "space-marines",
    listSize: "strike-force",
    dataVersion: "2026-05-09 23:42:21",
    selections: {
        detachments: ["gladius-task-force"],
        units: [
            {
                instanceId: "u1",
                datasheetId: "000000079",
                loadout: ["000000079:force-weapon"],
                modelCount: 1,
            },
        ],
    },
};

const errorsFor = (body: unknown) => {
    const result = parseListInput(body);
    return result.ok ? [] : result.errors;
};

describe("parseListInput", () => {
    it("accepts a well-formed list", () => {
        const result = parseListInput(valid);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.name).toBe("Gladius test");
    });

    it("trims the name", () => {
        const result = parseListInput({ ...valid, name: "  padded  " });
        expect(result.ok && result.value.name).toBe("padded");
    });

    it("rejects a non-object body", () => {
        expect(errorsFor("nope")).toEqual(["body must be a JSON object"]);
        expect(errorsFor(null)).toEqual(["body must be a JSON object"]);
        expect(errorsFor([])).toEqual(["body must be a JSON object"]);
    });

    it("requires the identity fields", () => {
        const errors = errorsFor({ selections: { detachments: [], units: [] } });
        expect(errors).toContain("name is required");
        expect(errors).toContain("factionSlug is required");
        expect(errors).toContain("dataVersion is required");
        expect(errors).toContain("listSize is required");
    });

    it("rejects a list size the library does not know", () => {
        // An unknown size has no budget, so nothing downstream could validate it.
        expect(errorsFor({ ...valid, listSize: "apocalypse" })).toContain(
            'listSize "apocalypse" is not a known battle size',
        );
    });

    it("treats a blank name as missing", () => {
        expect(errorsFor({ ...valid, name: "   " })).toContain("name is required");
    });

    it("collects every problem rather than stopping at the first", () => {
        const errors = errorsFor({ name: "", factionSlug: "", listSize: "" });
        expect(errors.length).toBeGreaterThan(2);
    });

    describe("selections", () => {
        it("requires detachments to be an array of slugs", () => {
            expect(
                errorsFor({ ...valid, selections: { detachments: "gladius", units: [] } }),
            ).toContain("selections.detachments must be an array of slugs");
        });

        it("accepts an empty selection, since a list is built up over time", () => {
            const result = parseListInput({
                ...valid,
                selections: { detachments: [], units: [] },
            });
            expect(result.ok).toBe(true);
        });

        it("requires each unit's identity and model count", () => {
            const errors = errorsFor({
                ...valid,
                selections: { detachments: [], units: [{}] },
            });
            expect(errors).toContain("selections.units[0].instanceId is required");
            expect(errors).toContain("selections.units[0].datasheetId is required");
            expect(errors).toContain(
                "selections.units[0].modelCount must be a whole number of at least 1",
            );
        });

        it("rejects a model count of zero or a fraction", () => {
            const bad = (modelCount: unknown) =>
                errorsFor({
                    ...valid,
                    selections: {
                        detachments: [],
                        units: [{ instanceId: "u1", datasheetId: "d", loadout: [], modelCount }],
                    },
                });
            expect(bad(0).length).toBeGreaterThan(0);
            expect(bad(1.5).length).toBeGreaterThan(0);
            expect(bad("3").length).toBeGreaterThan(0);
        });

        it("rejects an attachment pointing at a unit not in the list", () => {
            // It would silently detach on load otherwise.
            expect(
                errorsFor({
                    ...valid,
                    selections: {
                        detachments: [],
                        units: [
                            {
                                instanceId: "u1",
                                datasheetId: "d",
                                loadout: [],
                                modelCount: 1,
                                attachedTo: "ghost",
                            },
                        ],
                    },
                }),
            ).toContain(
                'selections.units[u1].attachedTo "ghost" is not a unit in this list',
            );
        });

        it("accepts an attachment pointing at a unit that is present", () => {
            const result = parseListInput({
                ...valid,
                selections: {
                    detachments: [],
                    units: [
                        { instanceId: "u1", datasheetId: "d1", loadout: [], modelCount: 1 },
                        {
                            instanceId: "u2",
                            datasheetId: "d2",
                            loadout: [],
                            modelCount: 1,
                            attachedTo: "u1",
                        },
                    ],
                },
            });
            expect(result.ok).toBe(true);
        });

        it("rejects duplicate instanceIds, which attachments could not disambiguate", () => {
            expect(
                errorsFor({
                    ...valid,
                    selections: {
                        detachments: [],
                        units: [
                            { instanceId: "u1", datasheetId: "d1", loadout: [], modelCount: 1 },
                            { instanceId: "u1", datasheetId: "d2", loadout: [], modelCount: 1 },
                        ],
                    },
                }),
            ).toContain("selections.units contains duplicate instanceIds");
        });

        it("rejects a loadout that is not a list of ids", () => {
            expect(
                errorsFor({
                    ...valid,
                    selections: {
                        detachments: [],
                        units: [
                            { instanceId: "u1", datasheetId: "d", loadout: [7], modelCount: 1 },
                        ],
                    },
                }),
            ).toContain("selections.units[0].loadout must be an array of ids");
        });
    });
});
