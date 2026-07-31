/**
 * Parsing one wargear option description into what it targets and what it does.
 *
 * Ported from ../40k-game-buddy/scripts/regex-parsers/generate-valid-loadouts.js
 * (`TARGETING_PATTERNS`, `ACTION_PATTERNS`, `CONSTRAINT_PATTERNS`).
 *
 * The output never reaches the codex — `wargear.options` carries only `raw`.
 * These structures exist to feed loadout enumeration, so the types live here
 * rather than in app/types.
 *
 * **Apostrophes.** The original patterns spelled the possessive as
 * `(?:'s|'s|\s+can)` — two identical straight apostrophes, the curly one having
 * been flattened somewhere upstream, exactly like PROFILE_SEPARATORS in
 * data/fetch/vendor/utils/wargear.ts. The source writes U+2019, so those
 * patterns never matched a possessive. Every one here uses the APOS class.
 */
import {
    cleanWeaponName,
    parseNumber,
    parseWeaponWithCount,
    stripHtml,
    stripPossessivePrefix,
} from "./resolveNames";

/** Straight or curly apostrophe. The source uses U+2019; prose uses either. */
const APOS = "['’]";
/** A possessive ending, or the bare "can" that follows an unpossessed subject. */
const POSSESSIVE = `(?:${APOS}s|${APOS}|\\s+can)`;

export interface WeaponRef {
    name: string;
    count: number;
}

export interface WeaponChoice {
    weapons: WeaponRef[];
    /** True when every weapon in the choice is taken together, not chosen between. */
    isPackage: boolean;
}

export interface TargetingDef {
    type:
        | "this-model"
        | "this-unit"
        | "specific-model"
        | "n-model-specific"
        | "all-models"
        | "any-number"
        | "ratio"
        | "ratio-capped"
        | "up-to-n"
        | "count"
        | "each-model-type"
        | "conditional"
        | "if-unit-size"
        | "unknown";
    modelType?: string;
    count?: number;
    ratio?: number;
    maxPerRatio?: number;
    maxTotal?: number;
    unitSizeThreshold?: number;
    condition?: {
        type: "equipped-with" | "not-equipped-with" | "already-equipped";
        weaponName?: string;
        weaponNames?: string[];
    };
}

export interface ActionDef {
    type: "replace" | "add" | "unknown";
    removes: WeaponRef[];
    adds: WeaponChoice[];
    isChoiceList: boolean;
}

export interface ConstraintsDef {
    restrictedWeapons?: string[];
    mutuallyExclusive?: [string, string][];
    maxWeaponCount?: { weapon: string; max: number }[];
    excludedWeapons?: string[];
    noDuplicates?: boolean;
    allowDuplicates?: boolean;
    mustBeDifferent?: boolean;
    maxSelections?: number;
}

export interface ParsedOption {
    line: number;
    rawText: string;
    /** False when neither a targeting nor an action pattern matched. */
    wargearParsed: boolean;
    targeting: TargetingDef;
    action: ActionDef;
    constraints: ConstraintsDef;
}

export interface RawOptionInput {
    line: number;
    description: string;
}

/* ── shared extraction ─────────────────────────────────────────────── */

const cleanModelType = (description: string): string =>
    description
        .replace(/^\d+[-\s]*\d*\s*/, "")
        .replace(/s$/, "")
        .trim();

function parseSingleWeaponRef(text: string): WeaponRef | null {
    if (!text) return null;
    const match = text.match(/^(\d+)?\s*(.+)$/);
    if (!match) return null;

    const name = cleanWeaponName(match[2]);
    if (!name) return null;
    return { name, count: match[1] ? parseInt(match[1], 10) : 1 };
}

/** Weapons being removed, which may be an "X and Y" pair. */
function extractWeaponRefs(text: string): WeaponRef[] {
    return stripPossessivePrefix(text.trim())
        .split(/\s+and\s+/i)
        .map((part) => parseSingleWeaponRef(stripPossessivePrefix(part.trim())))
        .filter((ref): ref is WeaponRef => ref !== null);
}

function parseWeaponChoiceItem(text: string): WeaponChoice | null {
    const cleaned = text.trim();
    if (!cleaned) return null;

    // "1 storm shield and 1 power sword" — taken together, so one choice.
    const packageMatch = cleaned.split(/\s+and\s+/i);
    if (packageMatch.length > 1) {
        const weapons = packageMatch
            .map((part) => parseSingleWeaponRef(part.trim()))
            .filter((ref): ref is WeaponRef => ref !== null);
        if (weapons.length > 1) return { weapons, isPackage: true };
    }

    const single = parseSingleWeaponRef(cleaned);
    return single ? { weapons: [single], isPackage: false } : null;
}

function extractChoicesFallback(text: string): WeaponChoice[] {
    return text
        .split(/\s*[,;]\s*/)
        .filter((part) => part.trim())
        .map((part) => parseSingleWeaponRef(part.trim()))
        .filter((ref): ref is WeaponRef => ref !== null)
        .map((ref) => ({ weapons: [ref], isPackage: false }));
}

function extractWeaponChoices(text: string): WeaponChoice[] {
    if (!text) return [];
    const cleaned = text.trim();

    if (cleaned.includes("<li>")) {
        const choices: WeaponChoice[] = [];
        const liPattern = /<li>([\s\S]*?)<\/li>/gi;
        let match: RegExpExecArray | null;
        while ((match = liPattern.exec(cleaned)) !== null) {
            const choice = parseWeaponChoiceItem(stripHtml(match[1]));
            if (choice) choices.push(choice);
        }
        if (choices.length > 0) return choices;
    }

    const single = parseWeaponChoiceItem(cleaned);
    if (single) return [single];
    return extractChoicesFallback(cleaned);
}

function extractChoiceListAfterColon(text: string): string {
    const colon = text.indexOf(":");
    if (colon === -1) {
        const following = text.match(/following[:\s]*(.+)$/i);
        return following ? following[1] : "";
    }
    return text.substring(colon + 1).trim();
}

function parseEquippedCondition(text: string): TargetingDef["condition"] {
    const pair = text.match(/(.+?)\s+and\s+(.+)/i);
    if (pair) {
        return {
            type: "equipped-with",
            weaponNames: [pair[1].trim(), pair[2].trim()],
        };
    }
    return { type: "equipped-with", weaponName: text.trim() };
}

/* ── targeting ─────────────────────────────────────────────────────── */

interface TargetingPattern {
    name: string;
    pattern: RegExp;
    extract: (match: RegExpMatchArray) => TargetingDef;
}

const NUM = "\\d+|one|two|three|four|five|six|seven|eight|nine|ten";

const TARGETING_PATTERNS: TargetingPattern[] = [
    { name: "none", pattern: /^none\.?$/i, extract: () => ({ type: "unknown" }) },
    { name: "footnote", pattern: /^\*\s/, extract: () => ({ type: "unknown" }) },
    {
        name: "if-unit-size",
        pattern: /^if this unit contains (?:between )?(\d+)(?: and \d+)? models/i,
        extract: (m) => ({ type: "if-unit-size", unitSizeThreshold: parseInt(m[1], 10) }),
    },
    {
        name: "if-unit-size-threshold",
        pattern: /^if this unit contains (\d+) or (?:more|fewer) models/i,
        extract: (m) => ({ type: "if-unit-size", unitSizeThreshold: parseInt(m[1], 10) }),
    },
    {
        name: "if-model-equipped",
        pattern: new RegExp(`^if this unit${APOS}?s?\\s+(.+?)\\s+is equipped with`, "i"),
        extract: (m) => ({
            type: "conditional",
            modelType: m[1].trim(),
            condition: { type: "equipped-with" },
        }),
    },
    {
        name: "conditional-equipped",
        pattern: /^if (?:this model is )?equipped with (.+?),/i,
        extract: (m) => ({
            type: "conditional",
            condition: parseEquippedCondition(m[1]),
        }),
    },
    {
        name: "this-unit",
        pattern: /^this unit can be equipped/i,
        extract: () => ({ type: "this-unit" }),
    },
    {
        name: "all-models",
        pattern: /^all (?:of the )?models in this unit/i,
        extract: () => ({ type: "all-models" }),
    },
    {
        name: "ratio-capped-with-model-type",
        pattern:
            /^for every (\d+) models in (?:this|the) unit,?\s*(?:.*?)up to (\d+)\s+([\w\s-]+?)\s+can/i,
        extract: (m) => ({
            type: "ratio",
            ratio: parseInt(m[1], 10),
            count: parseInt(m[2], 10),
            modelType: cleanModelType(m[3].trim()),
        }),
    },
    {
        name: "ratio-capped",
        pattern: /^for every (\d+) models in (?:this|the) unit,? (?:.*?)up to (\d+)/i,
        extract: (m) => ({
            type: "ratio-capped",
            ratio: parseInt(m[1], 10),
            maxPerRatio: parseInt(m[2], 10),
        }),
    },
    {
        name: "ratio-with-model-type",
        pattern: new RegExp(
            `^for every (\\d+) models in (?:this|the) unit,?\\s+(\\d+)\\s+([\\w\\s]+?)${APOS}s`,
            "i",
        ),
        extract: (m) => {
            const modelType = m[3].trim();
            // "model"/"models" is the generic subject, not a named model type.
            const generic = /^models?$/i.test(modelType);
            return {
                type: "ratio",
                ratio: parseInt(m[1], 10),
                count: parseInt(m[2], 10),
                ...(generic ? {} : { modelType }),
            };
        },
    },
    {
        name: "ratio",
        pattern: /^for every (\d+) models/i,
        extract: (m) => ({ type: "ratio", ratio: parseInt(m[1], 10) }),
    },
    {
        name: "any-number",
        pattern: /^any number of (?:models|[\w\s]+)/i,
        extract: () => ({ type: "any-number" }),
    },
    {
        name: "up-to-n-model-type",
        pattern: new RegExp(`^up to (${NUM})\\s+([\\w\\s-]+?)\\s+can`, "i"),
        extract: (m) => ({
            type: "count",
            count: parseNumber(m[1]),
            modelType: cleanModelType(m[2].trim()),
        }),
    },
    {
        name: "up-to-n",
        pattern: new RegExp(`^up to (${NUM})`, "i"),
        extract: (m) => ({ type: "up-to-n", maxTotal: parseNumber(m[1]) }),
    },
    {
        name: "each-model-type",
        pattern: new RegExp(`^each ([\\w\\s]+?)${POSSESSIVE}`, "i"),
        extract: (m) => ({ type: "each-model-type", modelType: m[1].trim() }),
    },
    {
        name: "specific-model-dual",
        pattern: new RegExp(
            `^the ([\\w\\s]+?)${APOS}s\\s+(.+?)\\s+and\\s+(.+?)\\s+can be replaced`,
            "i",
        ),
        extract: (m) => ({ type: "specific-model", modelType: m[1].trim() }),
    },
    {
        name: "specific-model",
        pattern: new RegExp(`^the ([\\w\\s]+?)${POSSESSIVE}`, "i"),
        extract: (m) => ({ type: "specific-model", modelType: m[1].trim() }),
    },
    {
        name: "n-model-generic",
        pattern: new RegExp(`^(${NUM})\\s+models?\\s+can\\s+(?:be\\s+)?equipped`, "i"),
        extract: (m) => ({ type: "count", count: parseNumber(m[1]) }),
    },
    {
        name: "n-model-specific",
        pattern: new RegExp(
            `^(${NUM})\\s+([\\w\\s]+?)(?:${APOS}s|\\s+can|\\s+(?:model\\s+)?(?:already\\s+)?equipped)`,
            "i",
        ),
        extract: (m) => ({
            type: "n-model-specific",
            count: parseNumber(m[1]),
            modelType: m[2].trim(),
        }),
    },
    {
        name: "this-model",
        pattern: new RegExp(`^this model(?:${APOS}s|\\s+can)?`, "i"),
        extract: () => ({ type: "this-model" }),
    },
];

export function matchTargeting(text: string): TargetingDef {
    const trimmed = text.trim();
    for (const { pattern, extract } of TARGETING_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match) return extract(match);
    }
    return { type: "unknown" };
}

/* ── actions ───────────────────────────────────────────────────────── */

interface ActionPattern {
    name: string;
    pattern: RegExp;
    extract: (match: RegExpMatchArray, text: string) => ActionDef;
}

const choiceAction = (
    type: "replace" | "add",
    removes: WeaponRef[],
    choiceText: string,
): ActionDef => ({
    type,
    removes,
    adds: extractWeaponChoices(choiceText),
    isChoiceList: true,
});

const singleAdd = (
    type: "replace" | "add",
    removes: WeaponRef[],
    count: string,
    name: string,
): ActionDef => ({
    type,
    removes,
    adds: [
        {
            weapons: [{ name: cleanWeaponName(name), count: parseInt(count, 10) }],
            isPackage: false,
        },
    ],
    isChoiceList: false,
});

const ACTION_PATTERNS: ActionPattern[] = [
    {
        name: "replace-with-choice",
        pattern: /([\s\S]+?)\s+can be replaced with one of the following[:\s<]*([\s\S]*)$/i,
        extract: (m, text) =>
            choiceAction(
                "replace",
                extractWeaponRefs(m[1]),
                m[2] || extractChoiceListAfterColon(text),
            ),
    },
    {
        name: "equip-with-choice",
        pattern: /can be equipped with one of the following[:\s<]*([\s\S]*)$/i,
        extract: (m, text) =>
            choiceAction("add", [], m[1] || extractChoiceListAfterColon(text)),
    },
    {
        name: "equip-up-to",
        pattern: new RegExp(
            `can be equipped with up to (${NUM}) of the following[:\\s<]*([\\s\\S]*)$`,
            "i",
        ),
        extract: (m, text) =>
            choiceAction("add", [], m[2] || extractChoiceListAfterColon(text)),
    },
    {
        name: "equip-with-list",
        pattern: /can be equipped with[:\s]*<ul>/i,
        extract: (_m, text) => {
            const adds = extractWeaponChoices(extractChoiceListAfterColon(text));
            return { type: "add", removes: [], adds, isChoiceList: adds.length > 1 };
        },
    },
    {
        name: "replace-multiple-with",
        pattern: /([\s\S]+?)\s+and\s+([\s\S]+?)\s+can be replaced with[:\s]*(.+)$/i,
        extract: (m) => {
            const removes = [
                ...extractWeaponRefs(m[1]),
                ...extractWeaponRefs(m[2]),
            ];
            const adds = extractWeaponChoices(m[3]);
            return { type: "replace", removes, adds, isChoiceList: adds.length > 1 };
        },
    },
    {
        name: "replace-with-package",
        pattern:
            /(.+?)\s+can be replaced with\s+(\d+)\s+(.+?)\s+and\s+(\d+)\s+(.+?)(?:\.|$)/i,
        extract: (m) => ({
            type: "replace",
            removes: extractWeaponRefs(m[1]),
            adds: [
                {
                    weapons: [
                        { name: cleanWeaponName(m[3]), count: parseInt(m[2], 10) },
                        { name: cleanWeaponName(m[5]), count: parseInt(m[4], 10) },
                    ],
                    isPackage: true,
                },
            ],
            isChoiceList: false,
        }),
    },
    {
        name: "replace-with-single",
        pattern: /(.+?)\s+can be replaced with\s+(\d+)\s+(.+?)(?:\.|$)/i,
        extract: (m) => singleAdd("replace", extractWeaponRefs(m[1]), m[2], m[3]),
    },
    {
        name: "each-equip-with-single",
        pattern: /can each be equipped with\s+(\d+)\s+(.+?)(?:\s*\(|\.|\*|$)/i,
        extract: (m) => singleAdd("add", [], m[1], m[2]),
    },
    {
        name: "equip-with-single",
        pattern: /can be equipped with\s+(\d+)\s+(.+?)(?:\s*\(|\.|\*|$)/i,
        extract: (m) => singleAdd("add", [], m[1], m[2]),
    },
    {
        name: "have-replaced-with",
        pattern: /can (?:each )?have (?:their|its)\s+([\s\S]+?)\s+replaced with\s+([\s\S]+?)(?:\.|$)/i,
        extract: (m, text) => {
            const removes = extractWeaponRefs(m[1]);
            if (/one of the following/i.test(m[2])) {
                return choiceAction(
                    "replace",
                    removes,
                    extractChoiceListAfterColon(text),
                );
            }
            const adds = extractWeaponChoices(m[2]);
            return { type: "replace", removes, adds, isChoiceList: adds.length > 1 };
        },
    },
    {
        name: "have-token",
        pattern: /it can have\s+(\d+)\s+(.+?)(?:\.|$)/i,
        extract: (m) => singleAdd("add", [], m[1], m[2]),
    },
    {
        name: "each-replace-with-choice",
        pattern:
            /can each replace (?:their|its)\s+([\s\S]+?)\s+with one of the following[:\s<]*([\s\S]*)$/i,
        extract: (m, text) =>
            choiceAction(
                "replace",
                extractWeaponRefs(m[1]),
                m[2] || extractChoiceListAfterColon(text),
            ),
    },
    {
        name: "each-replace-with-single",
        pattern: /can each replace (?:their|its)\s+(.+?)\s+with\s+(\d+)\s+(.+?)(?:\.|$)/i,
        extract: (m) => singleAdd("replace", extractWeaponRefs(m[1]), m[2], m[3]),
    },
    {
        name: "replace-with-choice-active",
        pattern:
            /can replace (?:its|their)\s+([\s\S]+?)\s+with one of the following[:\s<]*([\s\S]*)$/i,
        extract: (m, text) =>
            choiceAction(
                "replace",
                extractWeaponRefs(m[1]),
                m[2] || extractChoiceListAfterColon(text),
            ),
    },
    {
        name: "replace-with-single-active",
        pattern: /can replace (?:its|their)\s+(.+?)\s+with\s+(\d+)\s+(.+?)(?:\.|$)/i,
        extract: (m) => singleAdd("replace", extractWeaponRefs(m[1]), m[2], m[3]),
    },
];

export function matchAction(text: string): ActionDef {
    const trimmed = text.trim();
    for (const { pattern, extract } of ACTION_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match) return extract(match, trimmed);
    }
    return { type: "unknown", removes: [], adds: [], isChoiceList: false };
}

/* ── constraints ───────────────────────────────────────────────────── */

interface ConstraintPattern {
    name: string;
    pattern: RegExp;
    extract: (match: RegExpMatchArray, current: ConstraintsDef) => ConstraintsDef;
}

const CONSTRAINT_PATTERNS: ConstraintPattern[] = [
    {
        name: "restricted-weapon",
        pattern: new RegExp(
            `\\(that model${APOS}?s?\\s+(.+?)\\s+cannot be replaced\\)`,
            "i",
        ),
        extract: (m, current) => ({
            ...current,
            restrictedWeapons: [...(current.restrictedWeapons ?? []), m[1].trim()],
        }),
    },
    {
        name: "mutually-exclusive",
        pattern: /cannot be equipped with both (?:a |an )?(.+?) and (?:a |an )?(.+?)(?:\.|,|$)/gi,
        extract: (m, current) => ({
            ...current,
            mutuallyExclusive: [
                ...(current.mutuallyExclusive ?? []),
                [cleanWeaponName(m[1]), cleanWeaponName(m[2])] as [string, string],
            ],
        }),
    },
    {
        name: "max-weapon-count",
        pattern: /cannot be equipped with more than (\d+) (.+?)(?:\.|,|and|$)/gi,
        extract: (m, current) => ({
            ...current,
            maxWeaponCount: [
                ...(current.maxWeaponCount ?? []),
                { weapon: cleanWeaponName(m[2]), max: parseInt(m[1], 10) },
            ],
        }),
    },
    {
        name: "excluded-weapons",
        pattern:
            /cannot be equipped with (?:a |an )?([^,.]+?)(?: or (?:a |an )?([^,.]+?))?(?:\.|,|$)/i,
        extract: (m, current) => {
            // Those two forms are handled by their own patterns above; matching
            // them again here would record the whole clause as a weapon name.
            if (/^(?:both|more than)\s/i.test(m[1])) return current;
            const excluded = [cleanWeaponName(m[1])];
            if (m[2]) excluded.push(cleanWeaponName(m[2]));
            return {
                ...current,
                excludedWeapons: [...(current.excludedWeapons ?? []), ...excluded],
            };
        },
    },
    {
        name: "no-duplicates",
        pattern: /cannot take duplicates/i,
        extract: (_m, current) => ({ ...current, noDuplicates: true }),
    },
    {
        name: "allow-duplicates",
        pattern: /can take duplicates/i,
        extract: (_m, current) => ({ ...current, allowDuplicates: true }),
    },
    {
        name: "must-be-different",
        pattern: /two different (?:weapons|items)/i,
        extract: (_m, current) => ({ ...current, mustBeDifferent: true }),
    },
    {
        name: "max-selections-n",
        pattern: new RegExp(`up to (${NUM}) of the following`, "i"),
        extract: (m, current) => ({
            ...current,
            maxSelections: parseNumber(m[1]),
        }),
    },
];

export function matchConstraints(text: string): ConstraintsDef {
    let constraints: ConstraintsDef = {};

    for (const { pattern, extract } of CONSTRAINT_PATTERNS) {
        if (pattern.global) {
            pattern.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(text)) !== null) {
                constraints = extract(match, constraints);
            }
        } else {
            const match = text.match(pattern);
            if (match) constraints = extract(match, constraints);
        }
    }

    return constraints;
}

/* ── entry points ──────────────────────────────────────────────────── */

const isNoneKeyword = (text: string) => /^none\.?$/i.test(text.trim());
const isFootnote = (text: string) => text.trim().startsWith("*");

export function parseOption(option: RawOptionInput): ParsedOption {
    const text = option.description.trim();

    const targeting = matchTargeting(text);
    const action = matchAction(text);
    const constraints = matchConstraints(text);

    // "None." and footnotes carry no wargear, which is a complete reading of
    // them rather than a failure — so they count as parsed.
    const matched = targeting.type !== "unknown" && action.type !== "unknown";
    const wargearParsed = matched || isNoneKeyword(text) || isFootnote(text);

    return { line: option.line, rawText: text, wargearParsed, targeting, action, constraints };
}

export function parseAllOptions(options: RawOptionInput[]): ParsedOption[] {
    if (!options || options.length === 0) return [];
    return options.map(parseOption);
}
