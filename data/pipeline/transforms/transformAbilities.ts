import type { RawAbility } from "../types";

export interface ParsedAbilityCore {
    // Shared definition id — one per rule across every datasheet that has it
    // (000008343 = Deep Strike, 000008350 = Oath of Moment). A stable join key
    // to the library. The source leaves it blank on bespoke abilities, so it is
    // only emitted where present.
    id?: string;
    name: string;
    type: "Core" | "Faction";
    parameter?: number;
}

export interface ParsedAbilityDatasheet {
    name: string;
    legend: string;
    description: string;
    type: "Datasheet";
    parameter: string | null;
    mechanics: never[];
}

export type ParsedAbility = ParsedAbilityCore | ParsedAbilityDatasheet;

/**
 * A Faction ability's rules text, stored on the owning faction.json rather than
 * repeated on every datasheet that has it (Oath of Moment alone appears on 276).
 * Datasheets keep a {id, name, type} shell that resolves here by id.
 */
export interface ParsedFactionAbility {
    id: string;
    name: string;
    type: "Faction";
    legend: string;
    description: string;
}

/**
 * Pull the Faction ability definitions out of a raw datasheet.
 *
 * Core abilities are deliberately excluded — their rules live in
 * `app/library/unit-abilities`, which stays hand-authored and is never written
 * by the pipeline. Datasheet abilities are excluded too: they keep their own
 * description on the datasheet.
 *
 * Note the caller decides which faction these belong to, based on which
 * faction's datasheets they were found on. The source's `factionId` is wrong
 * here — Oath of Moment carries "WE" despite being Space Marine only.
 */
export function extractFactionAbilities(
    raw: RawAbility[],
): ParsedFactionAbility[] {
    return raw
        .filter((a) => a != null && !!a.id && a.type === "Faction")
        .map((a) => ({
            id: a.id,
            name: a.name,
            type: "Faction" as const,
            legend: a.legend ?? "",
            description: a.description,
        }));
}

/**
 * Extract trailing number parameter from ability name or description.
 * E.g. "Feel No Pain 5+" → 5
 */
function extractParameter(name: string): number | undefined {
    const match = name.match(/(\d+)\+?\s*$/);
    return match ? parseInt(match[1], 10) : undefined;
}

export function transformAbilities(raw: RawAbility[]): ParsedAbility[] {
    return raw.map((ability) => {
        if (ability.type === "Core" || ability.type === "Faction") {
            const param = extractParameter(ability.name);
            const result: ParsedAbilityCore = {
                ...(ability.id ? { id: ability.id } : {}),
                name: ability.name,
                type: ability.type,
            };
            if (param !== undefined) {
                result.parameter = param;
            }
            return result;
        }

        // Datasheet ability
        return {
            name: ability.name,
            legend: ability.legend ?? "",
            description: ability.description,
            type: "Datasheet" as const,
            parameter: ability.parameter === "" ? null : (ability.parameter ?? null),
            mechanics: [],
        };
    });
}
