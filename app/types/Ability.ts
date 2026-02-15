import { Mechanic } from "./Mechanic";

export interface Ability {
    name: string;
    type: "Core" | "Faction" | "Datasheet" | "Wargear";
    id?: string;
    legend?: string;
    factionId?: string;
    description?: string;
    parameter?: string;
    mechanics?: Mechanic[];
    sourceUnitName?: string;
    isFromLeader?: boolean;
}
