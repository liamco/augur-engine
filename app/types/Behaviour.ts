export interface MovementBehaviourDefinition {
    name: string;
    restricts?: string[];
}

export interface BehaviourOverride {
    name: string;
    allows?: string[];
    abilities?: string[];
}
