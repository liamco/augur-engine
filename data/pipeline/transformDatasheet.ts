import type { RawDatasheet, ParsedStratagem } from "./types";
import { restructureTopLevel } from "./transforms/restructureTopLevel";
import { transformKeywords } from "./transforms/transformKeywords";
import { transformModels } from "./transforms/transformModels";
import { transformUnitComposition } from "./transforms/transformUnitComposition";
import { transformCosts } from "./transforms/transformCosts";
import { transformWargear } from "./transforms/transformWargear";
import { transformAbilities } from "./transforms/transformAbilities";
import { transformDamaged } from "./transforms/transformDamaged";
import { extractCoreStratagems } from "./transforms/transformDetachments";

export interface TransformDatasheetResult {
    datasheet: Record<string, unknown>;
    coreStratagems: ParsedStratagem[];
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
    const wargear = transformWargear(raw.wargear, raw.loadout, raw.options);

    // 6. Transform abilities
    const abilities = transformAbilities(raw.abilities);

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

    return { datasheet, coreStratagems };
}
