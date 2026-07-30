import type {
    DatasheetEligibility,
    ParsedDetachment,
    RawDatasheet,
} from "../types";

/**
 * Datasheet ↔ detachment-content eligibility.
 *
 * The source repeats a detachment's stratagems, enhancements and abilities onto
 * every datasheet they can apply to. That relation is per *entity*, not per
 * detachment: 8930 of 11648 datasheet × detachment pairs list only a subset of
 * that detachment's stratagems, so collapsing it to the detachment alone would
 * discard most of the information.
 *
 * The pipeline inverts it — each stratagem/enhancement/ability records which
 * datasheets it applies to — which turns ~62,700 repeated pairs into ~16,500
 * ids once summarised as all/include/exclude.
 */

export interface EligibilityIndex {
    byStratagem: Map<string, Set<string>>;
    byEnhancement: Map<string, Set<string>>;
    byDetachmentAbility: Map<string, Set<string>>;
    /** Every datasheet seen, in processing order — the universe for "all". */
    datasheetIds: string[];
}

export function createEligibilityIndex(): EligibilityIndex {
    return {
        byStratagem: new Map(),
        byEnhancement: new Map(),
        byDetachmentAbility: new Map(),
        datasheetIds: [],
    };
}

interface IdentifiedEntry {
    id?: string;
}

function record(
    target: Map<string, Set<string>>,
    entries: (IdentifiedEntry | null)[] | null | undefined,
    datasheetId: string,
) {
    for (const entry of entries ?? []) {
        if (!entry?.id) continue;
        const existing = target.get(entry.id);
        if (existing) existing.add(datasheetId);
        else target.set(entry.id, new Set([datasheetId]));
    }
}

export function recordDatasheetEligibility(
    index: EligibilityIndex,
    raw: RawDatasheet,
) {
    index.datasheetIds.push(raw.id);
    record(index.byStratagem, raw.stratagems, raw.id);
    record(index.byEnhancement, raw.enhancements, raw.id);
    record(index.byDetachmentAbility, raw.detachmentAbilities, raw.id);
}

/**
 * Compact an eligible set against the universe of datasheets: "all" when it
 * covers everything, otherwise whichever of include/exclude is shorter.
 */
export function summariseEligibility(
    eligible: Set<string>,
    universe: string[],
): DatasheetEligibility {
    const included = universe.filter((id) => eligible.has(id));
    if (included.length === universe.length) return "all";

    const excluded = universe.filter((id) => !eligible.has(id));
    return included.length <= excluded.length
        ? { include: [...included].sort() }
        : { exclude: [...excluded].sort() };
}

export function applyEligibility(
    detachments: ParsedDetachment[],
    index: EligibilityIndex,
): ParsedDetachment[] {
    const universe = index.datasheetIds;

    return detachments.map((det) => {
        // A detachment's own eligibility is the union of its contents: a
        // datasheet that lists any of them listed the detachment.
        const union = new Set<string>();
        const annotate = <T extends { id: string }>(
            entries: T[],
            source: Map<string, Set<string>>,
        ): (T & { eligibleDatasheets: DatasheetEligibility })[] =>
            entries.map((entry) => {
                const eligible = source.get(entry.id) ?? new Set<string>();
                for (const id of eligible) union.add(id);
                return {
                    ...entry,
                    eligibleDatasheets: summariseEligibility(
                        eligible,
                        universe,
                    ),
                };
            });

        const abilities = annotate(det.abilities, index.byDetachmentAbility);
        const stratagems = annotate(det.stratagems, index.byStratagem);
        const enhancements = annotate(det.enhancements, index.byEnhancement);

        return {
            ...det,
            eligibleDatasheets: summariseEligibility(union, universe),
            abilities,
            stratagems,
            enhancements,
        };
    });
}
