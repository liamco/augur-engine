/**
 * Enumerating every legal weapon combination a unit can be fielded with.
 *
 * Ported from ../40k-game-buddy/scripts/regex-parsers/generate-valid-loadouts.js
 * (`generateValidLoadouts` and the helpers it drives).
 *
 * The shape is: start from each model type's default loadout, then walk the
 * parsed options applying each one as a branch — keeping both the loadout with
 * and without the change — deduplicating as we go. Model types whose results are
 * identical collapse into a single "any" group.
 *
 * Two deliberate changes from the original:
 *
 *  - **An unresolvable name fails the datasheet** rather than fabricating an id.
 *    The caller reports `loadoutsParsed: false`, so a half-understood option can
 *    never present itself as a complete list of combinations.
 *  - **Count variants are not synthesised.** The original invented extra weapons
 *    for "2 lascannons"; a multi-count reference here resolves to the base weapon.
 */
import { resolveNameToId, stripHtml, type NameLookup } from "./resolveNames";
import type { ConstraintsDef, ParsedOption, TargetingDef, WeaponRef } from "./parseOptions";
import {
    cleanModelType,
    parseDefaultLoadout,
    type UnitCompositionLine,
} from "./defaultLoadout";

export interface ValidLoadoutGroup {
    modelType: string;
    items: string[][];
}

export interface ValidLoadoutsResult {
    groups: ValidLoadoutGroup[];
    /**
     * False when any option went unparsed, named a weapon that does not exist, or
     * the enumeration hit the safety ceiling. The caller turns this into
     * `loadoutsParsed`.
     */
    allResolved: boolean;
}

export interface ValidLoadoutsInput extends NameLookup {
    defaultLoadoutRaw: string;
    unitComposition: UnitCompositionLine[];
    options: ParsedOption[];
}

/**
 * Ceiling on combinations per model type. Nothing real approaches it — the worst
 * datasheet in the sibling's corpus produces 630 — so hitting it means the
 * options were misread into a runaway branch. Reported as unresolved rather than
 * silently truncated.
 */
const MAX_COMBINATIONS = 5000;

/* ── model type matching ───────────────────────────────────────────── */

/** Singularise each word so "Missionaries" and "Missionary" compare equal. */
export function normalizeModelTypeName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .map((word) => {
            if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
            // "Assassins" → "Assassin", but never "Assassin" → "Assassi".
            if (word.endsWith("s") && !word.endsWith("ss") && word.length > 2) {
                return word.slice(0, -1);
            }
            return word;
        })
        .join(" ");
}

/**
 * Whether two model-type names refer to the same models.
 *
 * Plurals match; substrings deliberately do not — a rule for "Terminator" must
 * not capture "Terminator Sergeant", who is a different model with different
 * wargear.
 */
export function modelTypesMatch(typeA: string, typeB: string): boolean {
    const a = typeA.toLowerCase().trim();
    const b = typeB.toLowerCase().trim();
    if (a === b) return true;
    if (a === `${b}s` || `${a}s` === b) return true;
    return normalizeModelTypeName(a) === normalizeModelTypeName(b);
}

const getModelTypes = (unitComposition: UnitCompositionLine[]): string[] => {
    if (!unitComposition || unitComposition.length === 0) return ["any"];
    return unitComposition
        .filter((line) => line.description)
        .map((line) => cleanModelType(stripHtml(line.description)));
};

/* ── targeting ─────────────────────────────────────────────────────── */

export function targetingAppliesToModel(
    targeting: TargetingDef,
    modelType: string,
): boolean {
    switch (targeting.type) {
        case "this-model":
        case "all-models":
        case "any-number":
        case "this-unit":
        case "conditional":
        case "up-to-n":
            return true;

        case "specific-model":
        case "each-model-type":
        case "n-model-specific":
        case "count":
            // A named model type restricts the rule; without one these forms say
            // nothing about which model, so they cannot be assumed to apply.
            return targeting.modelType
                ? modelTypesMatch(targeting.modelType, modelType)
                : targeting.type === "count";

        case "ratio":
        case "ratio-capped":
            return targeting.modelType
                ? modelTypesMatch(targeting.modelType, modelType)
                : true;

        default:
            return true;
    }
}

/* ── loadout manipulation ──────────────────────────────────────────── */

/** Resolve a weapon reference, or null if the datasheet has no such weapon. */
const refToId = (ref: WeaponRef, lookup: NameLookup): string | null =>
    resolveNameToId(ref.name, lookup);

/**
 * Whether a loadout holds everything an option wants to remove.
 *
 * Falls back to treating the references as one compound weapon
 * ("scything talons and rending claws" is a single datasheet entry), which is why
 * a failure to match every item individually is not conclusive.
 */
function loadoutContainsAll(
    loadout: string[],
    removes: WeaponRef[],
    lookup: NameLookup,
): boolean {
    const ids = removes.map((ref) => refToId(ref, lookup));
    if (ids.every((id) => id !== null && loadout.includes(id))) return true;

    if (removes.length > 1) {
        const names = removes.map((r) => r.name);
        const compound = resolveNameToId(names.join(" and "), lookup);
        if (compound && loadout.includes(compound)) return true;

        if (names.length > 2) {
            const commaAnd = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
            const id = resolveNameToId(commaAnd, lookup);
            if (id && loadout.includes(id)) return true;
        }
    }

    return false;
}

function applyReplacement(
    loadout: string[],
    removes: WeaponRef[],
    adds: WeaponRef[],
    lookup: NameLookup,
): string[] | null {
    let next = [...loadout];

    let removed = 0;
    for (const ref of removes) {
        const id = refToId(ref, lookup);
        if (!id) return null;
        const before = next.length;
        next = next.filter((item) => item !== id);
        if (next.length < before) removed++;
    }

    // The individual names may describe one compound weapon entry.
    if (removed < removes.length && removes.length > 1) {
        const compound = resolveNameToId(
            removes.map((r) => r.name).join(" and "),
            lookup,
        );
        if (compound) next = next.filter((item) => item !== compound);
    }

    for (const ref of adds) {
        const id = refToId(ref, lookup);
        if (!id) return null;
        if (!next.includes(id)) next.push(id);
    }

    return next;
}

const deduplicateLoadouts = (loadouts: string[][]): string[][] => {
    const seen = new Set<string>();
    return loadouts.filter((loadout) => {
        const key = [...loadout].sort().join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

function conditionMet(
    condition: TargetingDef["condition"],
    loadout: string[],
    lookup: NameLookup,
): boolean {
    if (!condition) return true;
    if (condition.type !== "equipped-with") return true;

    const holds = (name: string) => {
        const id = resolveNameToId(name.replace(/^(a |an )/i, "").trim(), lookup);
        return id !== null && loadout.includes(id);
    };

    if (condition.weaponName) return holds(condition.weaponName);
    if (condition.weaponNames) return condition.weaponNames.every(holds);
    return true;
}

/* ── enumeration ───────────────────────────────────────────────────── */

interface Branch {
    loadouts: string[][];
    resolved: boolean;
}

function generateLoadoutsForModelType(
    modelType: string,
    baseLoadout: string[],
    options: ParsedOption[],
    lookup: NameLookup,
): Branch {
    let loadouts: string[][] = [baseLoadout];
    let resolved = true;

    for (const option of options) {
        if (!option.wargearParsed) continue;
        if (option.action.type === "unknown") continue;
        if (!targetingAppliesToModel(option.targeting, modelType)) continue;

        const next: string[][] = [];

        for (const loadout of loadouts) {
            // Every branch keeps the unmodified loadout: an option is something
            // the player *may* take, so declining it is always legal.
            next.push(loadout);

            if (
                option.targeting.type === "conditional" &&
                !conditionMet(option.targeting.condition, loadout, lookup)
            ) {
                continue;
            }

            if (option.action.type === "replace") {
                if (!loadoutContainsAll(loadout, option.action.removes, lookup)) {
                    continue;
                }
                for (const choice of option.action.adds) {
                    const swapped = applyReplacement(
                        loadout,
                        option.action.removes,
                        choice.weapons,
                        lookup,
                    );
                    if (!swapped) resolved = false;
                    else next.push(swapped);
                }
            } else {
                for (const choice of option.action.adds) {
                    const ids = choice.weapons.map((ref) => refToId(ref, lookup));
                    if (ids.some((id) => id === null)) {
                        resolved = false;
                        continue;
                    }
                    next.push([
                        ...loadout,
                        ...(ids as string[]).filter((id) => !loadout.includes(id)),
                    ]);
                }
            }
        }

        loadouts = deduplicateLoadouts(next);
        if (loadouts.length > MAX_COMBINATIONS) {
            return { loadouts: loadouts.slice(0, MAX_COMBINATIONS), resolved: false };
        }
    }

    return { loadouts, resolved };
}

function applyConstraints(
    loadouts: string[][],
    options: ParsedOption[],
    lookup: NameLookup,
): string[][] {
    const mutuallyExclusive: [string, string][] = [];
    const maxWeaponCount: { weapon: string; max: number }[] = [];

    for (const option of options) {
        const c: ConstraintsDef = option.constraints ?? {};
        if (c.mutuallyExclusive) mutuallyExclusive.push(...c.mutuallyExclusive);
        if (c.maxWeaponCount) maxWeaponCount.push(...c.maxWeaponCount);
    }

    if (mutuallyExclusive.length === 0 && maxWeaponCount.length === 0) {
        return loadouts;
    }

    return loadouts.filter((loadout) => {
        for (const [a, b] of mutuallyExclusive) {
            const idA = resolveNameToId(a, lookup);
            const idB = resolveNameToId(b, lookup);
            if (idA && idB && loadout.includes(idA) && loadout.includes(idB)) {
                return false;
            }
        }
        for (const { weapon, max } of maxWeaponCount) {
            const id = resolveNameToId(weapon, lookup);
            if (id && loadout.filter((item) => item === id).length > max) return false;
        }
        return true;
    });
}

/** Pick the default loadout that belongs to a model type. */
function baseLoadoutFor(
    modelType: string,
    defaults: { modelType: string; items: WeaponRef[] }[],
): WeaponRef[] | null {
    const exact = defaults.find(
        (d) => d.modelType !== "*all*" && modelTypesMatch(d.modelType, modelType),
    );
    if (exact) return exact.items;

    const all = defaults.find((d) => d.modelType === "*all*");
    if (all) return all.items;

    // "Sister" against "Sister Novitiate" — a prefix relationship only, never a
    // match in the middle of a name.
    const normalized = normalizeModelTypeName(modelType);
    const prefix = defaults.find((d) => {
        if (d.modelType === "*all*") return false;
        const other = normalizeModelTypeName(d.modelType);
        return other.startsWith(normalized) || normalized.startsWith(other);
    });
    if (prefix) return prefix.items;

    // No fallback to the first entry: guessing assigns one model's weapons to
    // another.
    return null;
}

export function generateValidLoadouts(
    input: ValidLoadoutsInput,
): ValidLoadoutsResult {
    const { defaultLoadoutRaw, unitComposition, options } = input;
    const lookup: NameLookup = {
        datasheetId: input.datasheetId,
        weapons: input.weapons,
        abilities: input.abilities,
    };

    // An option nobody could read means the combinations are unknowable, however
    // well the others parsed.
    let allResolved = options.every((option) => option.wargearParsed);

    const defaults = parseDefaultLoadout(defaultLoadoutRaw, unitComposition);
    if (defaults.length === 0) return { groups: [], allResolved: false };

    const modelTypes = getModelTypes(unitComposition);
    const perModelType = new Map<string, string[][]>();

    for (const modelType of modelTypes) {
        const base = baseLoadoutFor(modelType, defaults);
        if (!base) continue;

        const baseIds = base.map((item) => resolveNameToId(item.name, lookup));
        if (baseIds.some((id) => id === null)) {
            allResolved = false;
            continue;
        }

        const branch = generateLoadoutsForModelType(
            modelType,
            baseIds as string[],
            options,
            lookup,
        );
        if (!branch.resolved) allResolved = false;

        perModelType.set(
            modelType,
            applyConstraints(branch.loadouts, options, lookup),
        );
    }

    return { groups: groupByModelType(perModelType), allResolved };
}

/**
 * Collapse model types whose combinations are identical into a single "any"
 * group, which is how the shape represents "this applies to the whole unit".
 *
 * Only collapsed when *every* model type agrees; otherwise a model with fewer
 * options would silently inherit another's.
 */
function groupByModelType(
    perModelType: Map<string, string[][]>,
): ValidLoadoutGroup[] {
    if (perModelType.size === 0) return [];

    const key = (loadouts: string[][]) =>
        loadouts
            .map((l) => [...l].sort().join("|"))
            .sort()
            .join("~");

    const distinct = new Set([...perModelType.values()].map(key));
    if (distinct.size === 1) {
        return [{ modelType: "any", items: [...perModelType.values()][0] }];
    }

    return [...perModelType.entries()].map(([modelType, items]) => ({
        modelType,
        items,
    }));
}
