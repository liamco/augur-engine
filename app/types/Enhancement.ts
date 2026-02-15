export interface Enhancement {
    id: string;
    name: string;
    description?: string;
    legend?: string;
    cost?: number;
    factionId?: string;
    detachment?: string;
    detachmentId?: number;
    mechanics?: any[];
}
