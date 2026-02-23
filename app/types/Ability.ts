import { EngagementPhase } from "./Engagement";
import { Entity, Mechanic } from "./Mechanic";
import { TestUnit } from "./Test";

export interface Ability {
    name: string;
    type: "Core" | "Faction" | "Datasheet" | "Wargear";
    id?: string;
    legend?: string;
    factionId?: string;
    description?: string;
    parameter?: string;
    activationPhase?: EngagementPhase[];
    interface?: [];
    mechanics?: Mechanic[];
    sourceUnitName?: string;
    isFromLeader?: boolean;
}

type AbilityUIType = "singleSelect" | "multiSelect";

type AbilityUIOptions = TestUnit[];

export interface AbilityUI {
    type: AbilityUIType;
    name: string;
    value: string[];
    scope: Entity;
    options: AbilityUIOptions;
}
