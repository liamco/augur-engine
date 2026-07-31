import type {
    RawFactionDetachment,
    RawStratagem,
    ParsedDetachment,
    ParsedStratagem,
    ParsedEnhancement,
    ParsedDetachmentAbility,
} from "../types";
import type { Mechanic } from "@/app/types/Mechanic";
import { slugify } from "../utils/slugify";
import { extractDetachmentRuleMechanics } from "./abilityMechanics";
import type { Scope } from "./abilityMechanics/bearerScope";
import type { MechanicsSource } from "./transformAbilities";

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

/**
 * Extract a detachment rule's mechanics and label where they came from.
 *
 * `scopeFallback` distinguishes the two callers: an Enhancement's implicit
 * subject is the single model bearing it, a detachment ability's is a unit from
 * your army.
 */
function extractRule(
    name: string,
    description: string,
    scopeFallback: Scope,
): { mechanics: Mechanic[]; mechanicsSource: MechanicsSource } {
    const { mechanics } = extractDetachmentRuleMechanics(
        name,
        description,
        scopeFallback,
    );
    return {
        mechanics,
        mechanicsSource: mechanics.length > 0 ? "regex" : "unparsed",
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
        ...extractRule(raw.name, raw.description, "bearer"),
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
        ...extractRule(raw.name, raw.description, "unit"),
    };
}

/**
 * The detachment's own id lives only on its child entries, which all agree on it
 * (verified across all 64 detachments). Any populated array will do.
 */
function resolveDetachmentId(det: RawFactionDetachment): string {
    for (const entries of [det.abilities, det.stratagems, det.enhancements]) {
        for (const entry of entries ?? []) {
            if (entry?.detachmentId) return entry.detachmentId;
        }
    }
    return "";
}

export function transformDetachments(
    rawDetachments: RawFactionDetachment[],
): ParsedDetachment[] {
    return rawDetachments.map((det) => ({
        id: resolveDetachmentId(det),
        slug: slugify(det.name),
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
