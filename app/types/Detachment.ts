import { Enhancement } from "./Enhancement";
import { Mechanic } from "./Mechanic";

export interface DetachmentFaction {
    id: string;
    slug: string;
    name: string;
}

export interface DetachmentAbility {
    id: string;
    name: string;
    description: string;
    legend: string;
    mechanics?: Mechanic[];
}

/**
 * A detachment as the app consumes it, read from the generated
 * `app/codex/detachment-index.json`.
 *
 * Stratagems and datasheet-eligibility lists are deliberately absent — the index
 * exists to *select* a detachment, and both live on the detachment's own file at
 * `app/codex/factions/{slug}/detachments/{slug}.json`.
 */
export interface Detachment {
    id: string;
    slug: string;
    name: string;
    faction: DetachmentFaction;
    /** "codex" or a supplement slug; absent on factions with no plugins.json. */
    supplement?: string;
    detachmentPoints?: number | null;
    disposition?: string | null;
    abilities: DetachmentAbility[];
    enhancements: Enhancement[];
}
