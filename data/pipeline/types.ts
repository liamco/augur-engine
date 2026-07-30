// Raw input types matching the Wahapedia JSON structure

export interface RawAbility {
    id: string;
    name: string;
    legend: string;
    factionId: string;
    description: string;
    type: "Core" | "Faction" | "Datasheet";
    parameter?: string;
}

export interface RawKeyword {
    datasheetId: string;
    keyword: string;
    model: string;
    isFactionKeyword: string; // "true" | "false"
}

export interface RawModel {
    datasheetId: string;
    line: string;
    name: string;
    m: string;
    t: string;
    sv: string;
    invSv: string;
    invSvDescr: string;
    w: string;
    ld: string;
    oc: string;
    baseSize: string;
    baseSizeDescr: string;
}

export interface RawWeaponProfile {
    datasheetId: string;
    line: string;
    lineInWargear: string;
    dice: string;
    name: string;
    // Only present on multi-profile weapons (19 profiles): "standard"/"supercharge",
    // "strike"/"sweep", "frag"/"krak".
    profileName?: string;
    description: string;
    range: string;
    type: string;
    a: string;
    bsWs: string;
    s: string;
    ap: string;
    d: string;
}

export interface RawWeapon {
    id: string;
    datasheetId: string;
    line: string;
    name: string;
    type: string;
    profiles: RawWeaponProfile[];
}

export interface RawOption {
    datasheetId: string;
    line: string;
    button: string;
    description: string;
}

export interface RawUnitComposition {
    datasheetId: string;
    line: string;
    description: string;
}

export interface RawModelCost {
    datasheetId: string;
    line: string;
    description: string;
    cost: string;
}

export interface RawStratagem {
    factionId: string;
    name: string;
    id: string;
    type: string;
    cpCost: string;
    legend: string;
    turn: string;
    phase: string;
    detachment: string;
    detachmentId: string;
    description: string;
}

export interface RawEnhancement {
    factionId: string;
    id: string;
    name: string;
    cost: string;
    detachment: string;
    detachmentId: string;
    legend: string;
    description: string;
}

export interface RawDetachmentAbility {
    id: string;
    factionId: string;
    name: string;
    legend: string;
    description: string;
    detachment: string;
    detachmentId: string;
}

export interface RawLeaderRef {
    id: string;
    slug: string;
}

export interface RawDatasheet {
    id: string;
    name: string;
    factionId: string;
    sourceId: string;
    legend: string;
    role: string;
    loadout: string;
    transport: string;
    virtual: boolean;
    leaderHead: string;
    leaderFooter: string;
    damagedW: string;
    damagedDescription: string;
    link: string;
    slug: string;
    factionSlug: string;
    supplementKey: string;
    abilities: RawAbility[];
    keywords: RawKeyword[];
    models: RawModel[];
    options: RawOption[];
    wargear: RawWeapon[];
    unitComposition: RawUnitComposition[];
    modelCosts: RawModelCost[];
    stratagems: RawStratagem[];
    enhancements: RawEnhancement[];
    detachmentAbilities: RawDetachmentAbility[];
    leaders: RawLeaderRef[];
    supplementLabel: string;
    // Only present on datasheets that belong to a supplement (296 of 417).
    supplementSlug?: string;
    supplementName?: string;
    isSupplement: boolean;
    roleLabel: string;
    sourceName: string;
    isForgeWorld: boolean;
    isLegends: boolean;
}

// Faction file types

export interface RawDatasheetRef {
    id: string;
    slug: string;
    name: string;
    factionId: string;
    factionSlug: string;
    role: string;
    roleLabel: string;
    supplementKey: string;
    path: string;
    supplementLabel: string;
    isSupplement: boolean;
    link: string;
    isForgeWorld: boolean;
    isLegends: boolean;
}

export interface RawFactionDetachment {
    slug: string;
    name: string;
    abilities: RawDetachmentAbility[];
    enhancements: RawEnhancement[];
    stratagems: RawStratagem[];
}

export interface RawFaction {
    id: string;
    slug: string;
    name: string;
    link: string;
    /** Timestamp of the source data snapshot, e.g. "2026-01-14 00:30:31". */
    dataVersion?: string;
    datasheets: RawDatasheetRef[];
    detachments: RawFactionDetachment[];
}

// Parsed output types (subset of TestUnit that the pipeline produces)

/**
 * Which datasheets a detachment, stratagem, enhancement or detachment ability
 * applies to. "all" means every datasheet in the faction; otherwise whichever of
 * include/exclude is the shorter list.
 */
export type DatasheetEligibility =
    | "all"
    | { include: string[] }
    | { exclude: string[] };

export interface ParsedDetachmentAbility {
    id: string;
    name: string;
    description: string;
    legend: string;
    eligibleDatasheets?: DatasheetEligibility;
}

export interface ParsedStratagem {
    id: string;
    name: string;
    type: string;
    cpCost: number;
    legend: string;
    turn: string;
    phase: string;
    description: string;
    // Absent on core stratagems, which apply regardless of datasheet.
    eligibleDatasheets?: DatasheetEligibility;
}

export interface ParsedEnhancement {
    id: string;
    name: string;
    cost: number;
    legend: string;
    description: string;
    eligibleDatasheets?: DatasheetEligibility;
}

export interface ParsedDetachment {
    /** Source detachmentId, lifted from the detachment's child entries. */
    id: string;
    /**
     * Slug derived from `name` via slugify() and used for the output filename.
     * Differs from the source slug only in apostrophe handling — we drop them
     * ("lions-blade-task-force") where the source dashes them
     * ("lion-s-blade-task-force").
     */
    slug: string;
    name: string;
    abilities: ParsedDetachmentAbility[];
    stratagems: ParsedStratagem[];
    enhancements: ParsedEnhancement[];
    /** Union of the eligibility of everything the detachment contains. */
    eligibleDatasheets?: DatasheetEligibility;
    /**
     * The following three come from the hand-maintained detachment config
     * (`app/codex/factions/{slug}/plugins.json`) rather than the fetched
     * data, which carries none of them. Absent on factions with no config file.
     */
    supplement?: string;
    detachmentPoints?: number | null;
    /** Library disposition slug, e.g. "priority-assets". */
    disposition?: string | null;
}

export interface DatasheetRef {
    id: string;
    slug: string;
    name: string;
    role: string;
    isForgeWorld: boolean;
    isLegends: boolean;
}
