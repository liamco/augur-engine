import { EngagementPhase } from "./Engagement";

/**
 * Core mechanic types for the Combat Engine
 * Mirrors the schema defined in scripts/openai-extractors/mechanic-schema.js
 */
export interface Mechanic {
    name: string;
    entity: Entity;
    effect: Effect;
    attribute?: Attribute;
    phase?: EngagementPhase[];
    abilities?: string[];
    behaviours?: string[];
    weaponAttributes?: string[];
    keywords?: string[];
    state?: string[];
    value: boolean | number | string;
    conditions?: Condition[];
}

export interface Condition {
    entity: Entity;
    attribute?: Attribute;
    abilities?: string[];
    state?: string;
    keywords?: string[];
    operator: Operator;
    value: boolean | number | string | string[];
}

/**
 * Entity that a mechanic targets or references
 */
export type Entity =
    | "diceRoll"
    | "thisArmy"
    | "thisUnit"
    | "thisModel"
    | "opposingArmy"
    | "opposingUnit"
    | "opposingModel"
    | "ownArmy"
    | "ownUnit"
    | "ownModel"
    | "targetArmy"
    | "targetUnit"
    | "targetModel";

/**
 * Type of effect the mechanic applies
 */
export type Effect =
    | "addsAbility"
    | "addsBehaviour"
    | "addsKeyword"
    | "addsWeaponAttribute"
    | "autoSuccess"
    | "extraSuccess"
    | "forceRoll"
    | "halveDamage"
    | "ignoreBehaviour"
    | "ignoreModifier"
    | "ignoreState"
    | "minDamage"
    | "mortalWounds"
    | "rollBonus"
    | "rollPenalty"
    | "reroll"
    | "rollBlock"
    | "setsFnp"
    | "staticNumber";

/**
 * Roll-related attributes
 */
export type RollAttribute = "hit" | "wound" | "save";

/**
 * Unit characteristics
 */
export type UnitAttribute =
    | "movement"
    | "toughness"
    | "save"
    | "invulnSave"
    | "wounds"
    | "leadership"
    | "objectiveControl"
    | "feelNoPain";

/**
 * Weapon characteristics
 */
export type WeaponAttribute =
    | "range"
    | "attacks"
    | "skill"
    | "strength"
    | "armourPenetration"
    | "damage";

export type Attribute = RollAttribute | UnitAttribute | WeaponAttribute;

export type CombatState =
    | "activeModels"
    | "battleShock"
    | "damaged"
    | "benefitOfCover"
    | "unitStrength";

/**
 * Comparison operators for conditions
 */
export type Operator =
    | "equals"
    | "notEquals"
    | "greaterThan"
    | "greaterThanOrEqualTo"
    | "lessThan"
    | "lessThanOrEqualTo"
    | "includes"
    | "notIncludes"
    | "ratioOf";

/**
 * Condition that must be met for a mechanic to apply
 */
export interface Condition {
    entity: Entity;
    attribute?: Attribute;
    abilities?: string[];
    state?: string;
    keywords?: string[];
    operator: Operator;
    value: boolean | number | string | string[];
}
