import type { RawModelCost } from "../types";

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
        cost: parseInt(cost, 10),
        count: parseCount(description),
    }));
}
