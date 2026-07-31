/**
 * Which models on a datasheet may take each weapon.
 *
 * Ported from `computeWeaponEligibility` in
 * ../40k-game-buddy/scripts/regex-parsers/generate-valid-loadouts.js.
 *
 * Replaces the blanket `[{ type: "any" }]` the pipeline used to emit for every
 * weapon. That is right for a single-model unit like a Dreadnought and wrong for
 * a squad, where a plasma gun might be one per five models and a power fist
 * Sergeant-only.
 */
import { resolveNameToId, type NameLookup, type NameLookupEntry } from "./resolveNames";
import type { ParsedOption } from "./parseOptions";

export type EligibilityRule =
    | { type: "any" }
    | { type: "modelType"; modelType: string[] }
    | { type: "ratio"; ratio: number; count: number; modelType?: string[] }
    | { type: "count"; count: number; modelType?: string[] };

export interface WeaponEligibilityInput {
    weapons: NameLookupEntry[];
    /** From the default loadout: which model types start with which weapons. */
    defaultLoadoutByModelType: Record<string, string[]>;
    options: ParsedOption[];
}

/** Marker for "no model-type restriction at all". */
const ANY = "*any*";

interface Accumulator {
    modelTypes: Set<string>;
    ratio: { ratio: number; count: number; modelType: string | null } | null;
    countLimit: { count: number; modelType: string | null } | null;
    isUniversalDefault: boolean;
}

export function computeWeaponEligibility({
    weapons,
    defaultLoadoutByModelType,
    options,
}: WeaponEligibilityInput): Map<string, EligibilityRule[]> {
    const lookup: NameLookup = { datasheetId: "", weapons, abilities: [] };

    // Which model types start with each weapon.
    const defaultOwners = new Map<string, Set<string>>();
    for (const [modelType, ids] of Object.entries(defaultLoadoutByModelType)) {
        for (const id of ids) {
            if (!defaultOwners.has(id)) defaultOwners.set(id, new Set());
            defaultOwners.get(id)!.add(modelType);
        }
    }
    const modelTypeCount = Object.keys(defaultLoadoutByModelType).length;

    const accumulators = new Map<string, Accumulator>();
    for (const weapon of weapons) {
        const owners = defaultOwners.get(weapon.id) ?? new Set<string>();
        accumulators.set(weapon.id, {
            modelTypes: new Set(owners),
            ratio: null,
            countLimit: null,
            // Shared by every model type, so no restriction is meaningful.
            isUniversalDefault: owners.size === modelTypeCount && modelTypeCount > 0,
        });
    }

    for (const option of options) {
        if (!option.wargearParsed || option.action.type === "unknown") continue;

        const added = new Set<string>();
        for (const choice of option.action.adds) {
            for (const ref of choice.weapons) {
                const id = resolveNameToId(ref.name, lookup);
                if (id) added.add(id);
            }
        }
        if (added.size === 0) continue;

        const { targeting } = option;
        for (const id of added) {
            const acc = accumulators.get(id);
            if (!acc) continue;

            switch (targeting.type) {
                case "any-number":
                case "all-models":
                case "this-unit":
                case "this-model":
                case "conditional":
                    acc.modelTypes.add(ANY);
                    break;

                case "specific-model":
                case "each-model-type":
                    if (targeting.modelType) acc.modelTypes.add(targeting.modelType);
                    break;

                case "ratio":
                case "ratio-capped":
                    acc.ratio = {
                        ratio: targeting.ratio ?? 5,
                        count: targeting.count ?? targeting.maxPerRatio ?? 1,
                        modelType: targeting.modelType ?? null,
                    };
                    break;

                case "up-to-n":
                    acc.countLimit = { count: targeting.maxTotal ?? 1, modelType: null };
                    break;

                case "count":
                case "n-model-specific":
                    // Several bullets can each permit one more of the same weapon
                    // ("1 Battle Sister can…" twice means two), so same-scope
                    // limits add up rather than overwrite.
                    acc.countLimit = addCount(
                        acc.countLimit,
                        targeting.count ?? 1,
                        targeting.modelType ?? null,
                    );
                    break;

                default:
                    acc.modelTypes.add(ANY);
                    break;
            }
        }
    }

    const result = new Map<string, EligibilityRule[]>();
    for (const weapon of weapons) {
        result.set(weapon.id, toRules(accumulators.get(weapon.id)));
    }
    return result;
}

const addCount = (
    current: Accumulator["countLimit"],
    count: number,
    modelType: string | null,
): Accumulator["countLimit"] =>
    current && current.modelType === modelType
        ? { count: current.count + count, modelType }
        : { count, modelType };

/**
 * A weapon can carry more than one rule — a ratio *and* a model-type limit — so
 * this builds a list rather than choosing one.
 */
function toRules(acc: Accumulator | undefined): EligibilityRule[] {
    if (!acc) return [{ type: "any" }];
    if (acc.isUniversalDefault || acc.modelTypes.has(ANY)) return [{ type: "any" }];

    const rules: EligibilityRule[] = [];

    if (acc.ratio) {
        rules.push({
            type: "ratio",
            ratio: acc.ratio.ratio,
            count: acc.ratio.count,
            ...(acc.ratio.modelType ? { modelType: [acc.ratio.modelType] } : {}),
        });
    }

    if (acc.countLimit) {
        rules.push({
            type: "count",
            count: acc.countLimit.count,
            ...(acc.countLimit.modelType
                ? { modelType: [acc.countLimit.modelType] }
                : {}),
        });
    }

    // Model types already named by a ratio or count rule would be redundant here.
    const named = [acc.ratio?.modelType, acc.countLimit?.modelType];
    const remaining = [...acc.modelTypes].filter(
        (type) => type !== ANY && !named.includes(type),
    );
    if (remaining.length > 0) {
        rules.push({ type: "modelType", modelType: remaining });
    }

    return rules.length > 0 ? rules : [{ type: "any" }];
}
