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

    it("removes datasheetId and line from weapon level", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        const weapon = result.weapons[0] as unknown as Record<string, unknown>;

        expect(weapon).not.toHaveProperty("datasheetId");
        expect(weapon).not.toHaveProperty("line");
    });

    it("removes lineInWargear from profiles", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        const profile = result.weapons[0].profiles[0] as unknown as Record<string, unknown>;

        expect(profile).not.toHaveProperty("lineInWargear");
    });

    it("removes description from profiles", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);
        const profile = result.weapons[0].profiles[0] as unknown as Record<string, unknown>;

        expect(profile).not.toHaveProperty("description");
    });

    it("sets up loadouts structure with empty parsed fields", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);

        expect(result.loadouts.default.raw).toBe(loadoutHtml);
        expect(result.loadouts.default.parsed).toEqual([]);
        expect(result.loadouts.default.byModelType).toEqual({});
        expect(result.loadouts.options.parsed).toEqual([]);
    });

    it("transforms options with parsed line numbers", () => {
        const result = transformWargear(rawWeapons, loadoutHtml, rawOptions);

        expect(result.loadouts.options.raw).toEqual([
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
