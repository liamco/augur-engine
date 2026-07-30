import type {
    ParsedDetachment,
    ParsedDetachmentAbility,
    ParsedEnhancement,
} from "../types";

export interface DetachmentIndexFaction {
    id: string;
    slug: string;
    name: string;
}

/** An enhancement as the index carries it — eligibility stripped. */
export type DetachmentIndexEnhancement = Omit<
    ParsedEnhancement,
    "eligibleDatasheets"
>;

export type DetachmentIndexAbility = Omit<
    ParsedDetachmentAbility,
    "eligibleDatasheets"
>;

export interface DetachmentIndexEntry {
    id: string;
    slug: string;
    name: string;
    faction: DetachmentIndexFaction;
    supplement?: string;
    detachmentPoints?: number | null;
    disposition?: string | null;
    abilities: DetachmentIndexAbility[];
    enhancements: DetachmentIndexEnhancement[];
}

export interface DetachmentIndexInput {
    faction: DetachmentIndexFaction;
    detachments: ParsedDetachment[];
}

/**
 * Build the cross-faction detachment index (`app/codex/detachment-index.json`).
 *
 * Every detachment already has its own file, so this exists purely to give a
 * client that cannot read the filesystem — the test lab — one importable list of
 * what detachments and enhancements exist. It is a projection, not a second
 * source of truth: regenerated on every full parse alongside the files it
 * summarises, the same way core-stratagems.json is.
 *
 * Stratagems and eligibility lists are dropped. They account for roughly 70% of
 * the bytes and neither is needed to *select* a detachment; anything that needs
 * them reads the detachment's own file.
 */
export function buildDetachmentIndex(
    inputs: DetachmentIndexInput[],
): DetachmentIndexEntry[] {
    const entries = inputs.flatMap(({ faction, detachments }) =>
        detachments.map((det) => toEntry(faction, det)),
    );

    return entries.sort(
        (a, b) =>
            a.faction.name.localeCompare(b.faction.name) ||
            a.name.localeCompare(b.name),
    );
}

function toEntry(
    faction: DetachmentIndexFaction,
    det: ParsedDetachment,
): DetachmentIndexEntry {
    const entry: DetachmentIndexEntry = {
        id: det.id,
        slug: det.slug,
        name: det.name,
        faction,
        abilities: det.abilities.map(stripEligibility),
        enhancements: det.enhancements.map(stripEligibility),
    };

    // Spread only what the config actually supplied — a faction with no
    // plugins.json should produce no keys rather than a row of nulls.
    if (det.supplement !== undefined) entry.supplement = det.supplement;
    if (det.detachmentPoints !== undefined) {
        entry.detachmentPoints = det.detachmentPoints;
    }
    if (det.disposition !== undefined) entry.disposition = det.disposition;

    return entry;
}

function stripEligibility<T extends { eligibleDatasheets?: unknown }>(
    item: T,
): Omit<T, "eligibleDatasheets"> {
    const { eligibleDatasheets: _ignored, ...rest } = item;
    return rest;
}
