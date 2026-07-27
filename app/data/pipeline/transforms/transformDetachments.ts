import type {
    RawFactionDetachment,
    RawStratagem,
    ParsedDetachment,
    ParsedStratagem,
    ParsedEnhancement,
    ParsedDetachmentAbility,
} from "../types";

/**
 * Strip detachment prefix from stratagem type.
 * "Assimilation Swarm – Battle Tactic Stratagem" → "Battle Tactic"
 */
function parseStratagemType(rawType: string): string {
    // Remove detachment prefix (everything before "–" or "-")
    const dashIdx = rawType.indexOf("–");
    const stripped = dashIdx >= 0 ? rawType.slice(dashIdx + 1).trim() : rawType;
    // Remove trailing " Stratagem"
    return stripped.replace(/\s*Stratagem\s*$/i, "").trim();
}

function transformStratagem(raw: RawStratagem): ParsedStratagem {
    return {
        id: raw.id,
        name: raw.name,
        type: parseStratagemType(raw.type),
        cpCost: parseInt(raw.cpCost, 10),
        legend: raw.legend,
        turn: raw.turn,
        phase: raw.phase,
        description: raw.description,
    };
}

function transformEnhancement(raw: {
    id: string;
    name: string;
    cost: string;
    legend: string;
    description: string;
}): ParsedEnhancement {
    return {
        id: raw.id,
        name: raw.name,
        cost: parseInt(raw.cost, 10),
        legend: raw.legend,
        description: raw.description,
    };
}

function transformDetachmentAbility(raw: {
    id: string;
    name: string;
    description: string;
    legend: string;
}): ParsedDetachmentAbility {
    return {
        id: raw.id,
        name: raw.name,
        description: raw.description,
        legend: raw.legend,
    };
}

export function transformDetachments(
    rawDetachments: RawFactionDetachment[],
): ParsedDetachment[] {
    return rawDetachments.map((det) => ({
        name: det.name,
        ability: transformDetachmentAbility(det.abilities[0]),
        stratagems: det.stratagems.map(transformStratagem),
        enhancements: det.enhancements.map(transformEnhancement),
    }));
}

/**
 * Extract core stratagems from a raw datasheet's stratagems array.
 * Core stratagems have empty factionId and detachmentId.
 */
export function extractCoreStratagems(
    rawStratagems: RawStratagem[],
): ParsedStratagem[] {
    return rawStratagems
        .filter((s) => !s.factionId && !s.detachmentId)
        .map(transformStratagem);
}
