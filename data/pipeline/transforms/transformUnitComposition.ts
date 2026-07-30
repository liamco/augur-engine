import type { RawUnitComposition } from "../types";

export interface ParsedUnitComposition {
    line: number;
    description: string;
    min: number;
    max: number;
}

// Counts sit at the head of the description ("1 Suppressor Sergeant",
// "4-9 Infernus Marines"). Anchoring keeps stray numbers later in the string
// (named models, wargear) from being read as a count. Source data uses both a
// plain hyphen and a non-breaking hyphen (U+2011) for ranges.
const COUNT_PATTERN = /^(\d+)(?:\s*[-‑–—]\s*(\d+))?/;

function stripHtml(html: string): string {
    // Tags become spaces rather than being deleted, so <br>/<li> separated
    // model names don't run together.
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Read the model count from a composition description. Returns null when the
 * line carries no count at all (e.g. an "OR" separator between alternative
 * compositions), leaving the fallback to the caller.
 */
export function parseCompositionCount(
    description: string,
): { min: number; max: number } | null {
    const match = description.trim().match(COUNT_PATTERN);
    if (!match) return null;

    const min = parseInt(match[1], 10);
    const max = match[2] ? parseInt(match[2], 10) : min;
    return { min, max };
}

export function transformUnitComposition(
    rawComposition: RawUnitComposition[],
): ParsedUnitComposition[] {
    return rawComposition.map((entry) => {
        const description = stripHtml(entry.description);
        const count = parseCompositionCount(description);

        return {
            line: parseInt(entry.line, 10),
            description,
            min: count?.min ?? 0,
            max: count?.max ?? 0,
        };
    });
}
