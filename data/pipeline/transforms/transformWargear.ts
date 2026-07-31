import type { RawWeapon, RawOption } from "../types";
import {
    parseDamageOrAttacks,
    parseRange,
    parseWeaponSkill,
} from "../utils/parseStats";
import { parseWeaponAttributes } from "../utils/parseWeaponAttributes";
import {
    buildDefaultLoadout,
    type DefaultLoadoutBlock,
    type UnitCompositionLine,
} from "./wargearLoadouts/defaultLoadout";
import { parseAllOptions } from "./wargearLoadouts/parseOptions";
import type { ParsedWargearAbility } from "./transformAbilities";
import { generateValidLoadouts } from "./wargearLoadouts/validLoadouts";
import {
    computeWeaponEligibility,
    type EligibilityRule,
} from "./wargearLoadouts/weaponEligibility";

export interface ParsedWeaponProfile {
    datasheetId: string;
    line: number;
    // The source's printed row index within the weapon. Kept because it does not
    // always match array position (178 of 2207 profiles differ).
    lineInWargear: number;
    dice: string;
    name: string;
    // Sub-profile label on multi-profile weapons ("supercharge", "sweep", "krak").
    profileName?: string;
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
    datasheetId: string;
    // The source's printed row index on the datasheet. Kept because it does not
    // always match array position (94 of 2198 weapons differ).
    line: number;
    name: string;
    type: "Ranged" | "Melee";
    profiles: ParsedWeaponProfile[];
    /**
     * Which models may take this weapon. More than one rule can apply — a ratio
     * *and* a model-type limit — so this is a list. Derived from the wargear
     * options; `[{ type: "any" }]` when nothing restricts it.
     */
    eligibility: EligibilityRule[];
    count: number;
}

export interface ParsedWargearData {
    defaultLoadout: DefaultLoadoutBlock;
    weapons: ParsedWeapon[];
    /**
     * Wargear option descriptions as printed. Only `raw`: the structured reading
     * (targeting/action/constraints) is an input to loadout enumeration, not an
     * output, so it stays inside the pipeline.
     */
    options: { raw: ParsedRawOption[] };
    abilities: ParsedWargearAbility[];
    validLoadouts: ValidLoadoutGroup[];
    /**
     * True only when every option was understood *and* at least one legal
     * loadout came out. A datasheet with an unparsed option reports false rather
     * than offering a truncated list of combinations.
     */
    loadoutsParsed: boolean;
}

export interface ValidLoadoutGroup {
    modelType: string;
    items: string[][];
}

export interface ParsedRawOption {
    datasheetId: string;
    line: number;
    button: string;
    description: string;
}

/**
 * Weapon and profile names come through with the source's en dash
 * ("Macro plasma incinerator – standard"). Normalised to an ASCII hyphen so the
 * codex reads consistently wherever a name is displayed or compared.
 */
const normaliseDashes = (name: string): string => name.replace(/[–—]/g, "-");

export function transformWargear(
    rawWeapons: RawWeapon[],
    loadoutHtml: string,
    rawOptions: RawOption[],
    unitComposition: UnitCompositionLine[] = [],
    wargearAbilities: ParsedWargearAbility[] = [],
): ParsedWargearData {
    const weapons: ParsedWeapon[] = rawWeapons.map((weapon) => ({
        id: weapon.id,
        datasheetId: weapon.profiles[0]?.datasheetId ?? "",
        line: parseInt(weapon.line, 10),
        name: normaliseDashes(weapon.name),
        type: weapon.type as "Ranged" | "Melee",
        profiles: weapon.profiles.map((profile) => ({
            datasheetId: profile.datasheetId,
            line: parseInt(profile.line, 10),
            lineInWargear: parseInt(profile.lineInWargear, 10),
            dice: profile.dice,
            name: normaliseDashes(profile.name),
            ...(profile.profileName
                ? { profileName: profile.profileName }
                : {}),
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

    // Wargear abilities matter here as much as weapons: a loadout can name a
    // storm shield or a resurrection orb, and without them in the lookup the
    // whole datasheet reads as unparseable.
    const lookup = {
        datasheetId: weapons[0]?.datasheetId ?? "",
        weapons: weapons.map((w) => ({ id: w.id, name: w.name })),
        abilities: wargearAbilities.map((a) => ({ id: a.id, name: a.name })),
    };

    const defaultLoadout = buildDefaultLoadout(
        loadoutHtml,
        lookup,
        unitComposition,
    );

    const options = parseAllOptions(parsedOptions);

    const { groups, allResolved } = generateValidLoadouts({
        ...lookup,
        defaultLoadoutRaw: loadoutHtml,
        unitComposition,
        options,
    });

    // Per-weapon eligibility replaces the blanket "any" this used to emit. Right
    // for a Dreadnought either way; wrong before now for a squad where a plasma
    // gun is one per five models.
    const eligibility = computeWeaponEligibility({
        weapons: lookup.weapons,
        defaultLoadoutByModelType: defaultLoadout.byModelType,
        options,
    });

    return {
        defaultLoadout,
        weapons: weapons.map((weapon) => ({
            ...weapon,
            eligibility: eligibility.get(weapon.id) ?? [{ type: "any" as const }],
        })),
        options: { raw: parsedOptions },
        abilities: wargearAbilities,
        validLoadouts: groups,
        // True only when every option was understood and at least one legal
        // loadout came out, so an empty list never reads as a complete answer.
        loadoutsParsed: allResolved && groups.length > 0,
    };
}
