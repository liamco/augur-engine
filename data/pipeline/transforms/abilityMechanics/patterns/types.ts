import type { Mechanic } from "@/app/types/Mechanic";

export interface ExtractionContext {
    /** Ability name, used for the required `name` field on each mechanic. */
    abilityName: string;
}

export interface Pattern {
    /** Reported in the parse's per-pattern hit counts. */
    name: string;
    /**
     * Returns mechanics, or null to decline. Declining is always safe: the
     * ability keeps `mechanics: []`, which is the current behaviour. Emitting
     * something wrong is not safe, so patterns decline whenever unsure.
     */
    extract(text: string, ctx: ExtractionContext): Mechanic[] | null;
}
