export interface DamagedMechanic {
    entity: string; // e.g., "thisModel"
    effect: string; // e.g., "rollPenalty", "statPenalty", "statBonus"
    attribute: string; // e.g., "h" (hit), "oc", "a" (attacks)
    value: number;
    conditions?: {
        weapon?: string;
        operator?: string;
        value?: string;
    }[];
}

export interface DamagedProfile {
    range: string; // Original text like "1-4"
    threshold: number; // Upper bound (e.g., 4)
    description: string; // Text description of damaged effects
    mechanics: DamagedMechanic[]; // Parsed mechanics
}
