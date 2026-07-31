import { describe, it, expect } from "vitest";
import { transformWargear } from "../transformWargear";
import type { RawWeapon, RawOption } from "../../types";

describe("transformWargear", () => {
    const rawWeapons: RawWeapon[] = [
        {
            id: "000002694:prime-talons",
            datasheetId: "000002694",
            line: "1",
            name: "Prime talons",
            type: "Melee",
            profiles: [
                {
                    datasheetId: "000002694",
                    line: "1",
                    lineInWargear: "1",
                    dice: "",
                    name: "Prime talons",
                    description: "",
                    range: "Melee",
                    type: "Melee",
                    a: "6",
                    bsWs: "2",
                    s: "6",
                    ap: "-1",
                    d: "2",
                },
            ],
        },
    ];

    const rawOptions: RawOption[] = [
        {
            datasheetId: "000002694",
            line: "1",
            button: "•",
            description: "None",
        },
    ];

    const loadoutHtml =
        "<b>This model is equipped with:</b> Prime talons.";

    it("transforms weapons with parsed stats", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        const weapon = result.weapons[0];

        expect(weapon.id).toBe("000002694:prime-talons");
        expect(weapon.name).toBe("Prime talons");
        expect(weapon.type).toBe("Melee");
        expect(weapon.profiles[0].a).toBe(6);
        expect(weapon.profiles[0].bsWs).toBe(2);
        expect(weapon.profiles[0].s).toBe(6);
        expect(weapon.profiles[0].ap).toBe(-1);
        expect(weapon.profiles[0].d).toBe(2);
        expect(weapon.profiles[0].range).toBe("Melee");
        expect(weapon.profiles[0].line).toBe(1);
    });

    it("keeps datasheetId and line at weapon level", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        const weapon = result.weapons[0] as unknown as Record<string, unknown>;

        // datasheetId was previously trimmed here as redundant — it prefixes the
        // id and repeats on every profile. It is emitted again because the
        // agreed wargear shape carries it, and a consumer holding a weapon alone
        // should not have to parse the id to learn which datasheet it came from.
        expect(weapon.datasheetId).toBe("000002694");
        // line is NOT recoverable from array position: 94 of 2198 weapons in the
        // source have a line that differs from their index.
        expect(weapon.line).toBe(1);
    });

    it("keeps lineInWargear on profiles", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);

        // Likewise 178 of 2207 profiles have a lineInWargear that differs from
        // their position within the weapon.
        expect(result.weapons[0].profiles[0].lineInWargear).toBe(1);
    });

    it("carries profileName on a multi-profile weapon", () => {
        const withProfileName: RawWeapon[] = [
            {
                ...rawWeapons[0],
                name: "Plasma pistol",
                profiles: [
                    {
                        ...rawWeapons[0].profiles[0],
                        name: "Plasma pistol - supercharge",
                        profileName: "supercharge",
                    },
                ],
            },
        ];

        const result = transformWargear(withProfileName, "", []);

        expect(result.weapons[0].profiles[0].profileName).toBe("supercharge");
    });

    it("omits profileName when the source has none", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        const profile = result.weapons[0].profiles[0] as unknown as Record<string, unknown>;

        expect(profile).not.toHaveProperty("profileName");
    });

    it("removes description from profiles", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        const profile = result.weapons[0].profiles[0] as unknown as Record<string, unknown>;

        expect(profile).not.toHaveProperty("description");
    });

    it("keeps the default loadout's raw text", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        expect(result.defaultLoadout.raw).toBe(loadoutHtml);
    });

    it("enumerates loadouts and reports whether they can be trusted", () => {
        // An empty validLoadouts must never read as "this unit has no legal
        // loadouts" — loadoutsParsed is what says the list is complete.
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions, [
            { line: 1, description: "1 Winged Tyranid Prime", min: 1, max: 1 },
        ]);
        expect(Array.isArray(result.validLoadouts)).toBe(true);
        expect(typeof result.loadoutsParsed).toBe("boolean");
        // The fixture's only option is "None", so there is exactly the default.
        expect(result.loadoutsParsed).toBe(true);
        expect(result.validLoadouts).toHaveLength(1);
        expect(result.validLoadouts[0].items).toHaveLength(1);
    });

    it("gives every weapon at least one eligibility rule", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        for (const weapon of result.weapons) {
            expect(weapon.eligibility.length).toBeGreaterThan(0);
        }
    });

    it("carries the datasheetId onto each weapon", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        expect(result.weapons[0].datasheetId).toBe("000002694");
    });

    it("transforms options with parsed line numbers", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);

        expect(result.options.raw).toEqual([
            {
                datasheetId: "000002694",
                line: 1,
                button: "•",
                description: "None",
            },
        ]);
    });

    it("sets abilities to empty array", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        expect(result.abilities).toEqual([]);
    });

    it("parses the comma-separated attributes the source actually ships", () => {
        const weaponsWithAttrs: RawWeapon[] = [
            {
                ...rawWeapons[0],
                profiles: [
                    {
                        ...rawWeapons[0].profiles[0],
                        description:
                            "anti-infantry 4+, devastating wounds, rapid fire 1",
                    },
                ],
            },
        ];

        const result = transformWargear(weaponsWithAttrs, "", []);

        expect(result.weapons[0].profiles[0].attributes).toEqual([
            "ANTI-INFANTRY 4+",
            "DEVASTATING WOUNDS",
            "RAPID FIRE 1",
        ]);
    });

    it("parses weapon attributes from description", () => {
        const weaponsWithAttrs: RawWeapon[] = [
            {
                id: "test:weapon",
                datasheetId: "test",
                line: "1",
                name: "Test weapon",
                type: "Ranged",
                profiles: [
                    {
                        datasheetId: "test",
                        line: "1",
                        lineInWargear: "1",
                        dice: "",
                        name: "Test weapon",
                        description: "[ASSAULT], [SUSTAINED HITS 1]",
                        range: '18"',
                        type: "Ranged",
                        a: "D6",
                        bsWs: "-",
                        s: "4",
                        ap: "0",
                        d: "1",
                    },
                ],
            },
        ];

        const result = transformWargear(weaponsWithAttrs, "", []);
        const profile = result.weapons[0].profiles[0];

        expect(profile.attributes).toEqual(["ASSAULT", "SUSTAINED HITS 1"]);
        expect(profile.range).toBe(18);
        expect(profile.a).toBe("D6");
        expect(profile.bsWs).toBe("N/A");
    });
});
