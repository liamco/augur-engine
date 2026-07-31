import type { RawDatasheet, ParsedStratagem } from "./types";
import { restructureTopLevel } from "./transforms/restructureTopLevel";
import { transformKeywords } from "./transforms/transformKeywords";
import { transformModels } from "./transforms/transformModels";
import { transformUnitComposition } from "./transforms/transformUnitComposition";
import { transformCosts } from "./transforms/transformCosts";
import {
    transformWargear,
    type ParsedWargearData,
} from "./transforms/transformWargear";
import {
    transformAbilities,
    extractFactionAbilities,
    extractWargearAbilities,
    summariseAbilityMechanics,
    type ParsedFactionAbility,
} from "./transforms/transformAbilities";
import { transformDamaged } from "./transforms/transformDamaged";
import { extractCoreStratagems } from "./transforms/transformDetachments";

export interface AbilityMechanicsStats {
    parsed: number;
    unparsed: number;
    /** Pattern name -> number of abilities it contributed to. */
    perPattern: Record<string, number>;
}

export interface TransformDatasheetResult {
    /**
     * Loosely typed because the datasheet is assembled from many transforms and
     * written straight to JSON. `wargear` is called out because the coverage
     * report reads it back.
     */
    datasheet: Record<string, unknown> & { wargear: ParsedWargearData };
    coreStratagems: ParsedStratagem[];
    factionAbilities: ParsedFactionAbility[];
    mechanicsStats: AbilityMechanicsStats;
}

export function transformDatasheet(raw: RawDatasheet): TransformDatasheetResult {
    // 1. Restructure top-level fields
    const { faction, source, supplement, leader } = restructureTopLevel(raw);

    // 2. Transform keywords
    const keywords = transformKeywords(raw.keywords);

    // 3. Transform models (merge unit composition)
    const models = transformModels(raw.models, raw.unitComposition);

    // 3b. Unit composition as its own structure. Model statlines and
    // composition lines are independent axes (a single statline can cover
    // several composition entries), so the counts are kept here in full
    // rather than only as the per-statline merge above.
    const unitComposition = transformUnitComposition(raw.unitComposition);

    // 4. Transform costs
    const pointsCosts = transformCosts(raw.modelCosts);

    // 5. Transform wargear
    // Wargear-conferred abilities move off the abilities list and onto the
    // wargear, where the loadout parser can resolve references to them.
    const wargearAbilities = extractWargearAbilities(raw.abilities, raw.id);

    const wargear = transformWargear(
        raw.wargear,
        raw.loadout,
        raw.options,
        unitComposition,
        wargearAbilities,
    );

    // 6. Transform abilities. Core/Faction abilities reduce to shells here;
    // Faction rules text is emitted separately onto the faction file, and Core
    // rules stay hand-authored in app/library.
    const abilities = transformAbilities(raw.abilities);
    const factionAbilities = extractFactionAbilities(raw.abilities);
    const mechanicsStats = summariseAbilityMechanics(raw.abilities);

    // 7. Transform damaged profile
    const damaged = transformDamaged(raw.damagedW, raw.damagedDescription);

    // 8. Extract core stratagems as side output (discard the rest)
    const coreStratagems = extractCoreStratagems(raw.stratagems);

    // 9. Assemble output (no metadata fields, no redundant arrays)
    const datasheet = {
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
        legend: raw.legend,
        faction,
        source,
        role: raw.role,
        isForgeWorld: raw.isForgeWorld,
        isLegends: raw.isLegends,
        leader,
        keywords,
        transport: raw.transport,
        damaged,
        wargear,
        supplement,
        models,
        unitComposition,
        pointsCosts,
        abilities,
    };

    return { datasheet, coreStratagems, factionAbilities, mechanicsStats };
}
