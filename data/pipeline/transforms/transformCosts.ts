import type { RawModelCost } from "../types";
import { parseIntOrNull } from "../utils/parseStats";

export interface ParsedCost {
    cost: number;
    count: number;
}

function parseCount(description: string): number {
    const match = description.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
}

export function transformCosts(raw: RawModelCost[]): ParsedCost[] {
    return raw.map(({ cost, description }) => ({
        cost: parseIntOrNull(cost) ?? 0,
        count: parseCount(description),
    }));
}
