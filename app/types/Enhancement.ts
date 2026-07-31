import { Mechanic } from "./Mechanic";

export interface Enhancement {
    id: string;
    name: string;
    description?: string;
    legend?: string;
    cost?: number;
    factionId?: string;
    detachment?: string;
    detachmentId?: number;
    /**
     * Populated by the parse pipeline's regex extraction and the
     * parse-ability-mechanics skill. Read by collectEnhancementMechanics, which
     * feeds them straight into combat resolution, so the type is deliberately
     * exact rather than `any[]`.
     */
    mechanics?: Mechanic[];
    mechanicsSource?: string;
}
