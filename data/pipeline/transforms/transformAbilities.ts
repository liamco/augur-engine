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
