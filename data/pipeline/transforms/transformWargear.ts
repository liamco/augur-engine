import type { RawWeapon, RawOption } from "../types";
import {
    parseDamageOrAttacks,
    parseRange,
    parseWeaponSkill,
} from "../utils/parseStats";
import { parseWeaponAttributes } from "../utils/parseWeaponAttributes";

export interface ParsedWeaponProfile {
    datasheetId: string;
    line: number;
    dice: string;
    name: string;
    attributes: string[];
    range: number | string;
    type: "Ranged" | "Melee";
    a: number | string;
    bsWs: number | string;
    s: number;
    ap: number;
    d: number | string;
}

export interface ParsedWeapon {
    id: string;
    name: string;
    type: "Ranged" | "Melee";
    profiles: ParsedWeaponProfile[];
    eligibility: [{ type: "any" }];
    count: number;
}

export interface ParsedWargearData {
    loadouts: {
        default: {
            raw: string;
            parsed: string[];
            byModelType: Record<string, string[]>;
        };
        options: {
            raw: ParsedRawOption[];
            parsed: string[];
            byModelType: Record<string, string[]>;
        };
    };
    weapons: ParsedWeapon[];
    abilities: never[];
}

export interface ParsedRawOption {
    datasheetId: string;
    line: number;
    button: string;
    description: string;
}

export function transformWargear(
    rawWeapons: RawWeapon[],
    loadoutHtml: string,
    rawOptions: RawOption[],
): ParsedWargearData {
    const weapons: ParsedWeapon[] = rawWeapons.map((weapon) => ({
        id: weapon.id,
        name: weapon.name,
        type: weapon.type as "Ranged" | "Melee",
        profiles: weapon.profiles.map((profile) => ({
            datasheetId: profile.datasheetId,
            line: parseInt(profile.line, 10),
            dice: profile.dice,
            name: profile.name,
            attributes: parseWeaponAttributes(profile.description),
            range: parseRange(profile.range) ?? "Melee",
            type: profile.type as "Ranged" | "Melee",
            a: parseDamageOrAttacks(profile.a) ?? 0,
            bsWs: parseWeaponSkill(profile.bsWs),
            s: parseInt(profile.s, 10),
            ap: parseInt(profile.ap, 10),
            d: parseDamageOrAttacks(profile.d) ?? 0,
        })),
        eligibility: [{ type: "any" as const }],
        count: 1,
    }));

    const parsedOptions: ParsedRawOption[] = rawOptions.map((opt) => ({
        datasheetId: opt.datasheetId,
        line: parseInt(opt.line, 10),
        button: opt.button,
        description: opt.description,
    }));

    return {
        loadouts: {
            default: {
                raw: loadoutHtml,
                parsed: [],
                byModelType: {},
            },
            options: {
                raw: parsedOptions,
                parsed: [],
                byModelType: {},
            },
        },
        weapons,
        abilities: [],
    };
}
