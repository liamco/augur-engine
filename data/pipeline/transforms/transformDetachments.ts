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
        // Every ability, not just the first: 4 detachments carry a second rule
        // plus a separate "Restrictions" record. Others fold their restrictions
        // into the single ability's description instead.
        abilities: (det.abilities ?? []).map(transformDetachmentAbility),
        stratagems: det.stratagems.map(transformStratagem),
        enhancements: det.enhancements.map(transformEnhancement),
    }));
}

/**
 * Extract core stratagems from a raw datasheet's stratagems array.
 *
 * Selection is by the raw type prefix ("Core – Battle Tactic Stratagem"), which
 * must be read before parseStratagemType strips it. An empty
 * factionId/detachmentId is NOT sufficient: Boarding Actions stratagems have
 * both empty too, and several share a name with a Core stratagem while carrying
 * a materially different rule (e.g. INSANE BRAVERY).
 */
export function extractCoreStratagems(
    rawStratagems: RawStratagem[],
): ParsedStratagem[] {
    return rawStratagems
        .filter(
            (s): s is RawStratagem => s != null && !!s.type?.startsWith("Core"),
        )
        .map(transformStratagem);
}
