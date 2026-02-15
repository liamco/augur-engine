export interface LeaderConditions {
    allowedExistingLeaderKeywords?: string[];
    allowsAnyExistingLeader?: boolean;
    equipmentRequirements?: {
        targetUnitKeywords: string[];
        requiredEquipment: string;
    }[];
    maxOfThisType?: number;
    mustAttach?: boolean;
}

export interface LeaderData {
    description: string;
    footer: string;
    conditions: LeaderConditions | null;
    attachableUnits: string[];
}
