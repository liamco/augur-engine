import { Mechanic } from "./Mechanic";
import { EligibilityRule, Weapon } from "./Weapon";

export interface WargearData {
    defaultLoadout: {
        raw: string;
        parsed: string[];
    }[];
    weapons: Weapon[];
    abilities: WargearAbility[];
    options: {
        raw: {
            datasheetId: string;
            line: number;
            button: string;
            description: string;
        }[];
        parsed: {
            line: number;
            rawText: string;
            wargearParsed: boolean;
            targeting: TargetingDef;
            action: ActionDef;
            constraints: ConstraintsDef;
        }[];
        allParsed: boolean;
    };
    validLoadouts: ValidLoadoutGroup[];
    loadoutsParsed: boolean;
    unitWideOptions?: string[];
}

export interface WargearAbility {
    id: string;
    name: string;
    description?: string;
    mechanics?: Mechanic[];
    eligibility?: EligibilityRule[];
}

export interface ValidLoadoutGroup {
    modelType: string; // "any" (fallback), "all" (unit-wide), or specific type name
    items: string[][]; // Array of valid loadouts (each is array of weapon/ability IDs)
}

export type TargetingType =
    | "this-model"
    | "specific-model"
    | "n-model-specific"
    | "all-models"
    | "any-number"
    | "ratio"
    | "ratio-capped"
    | "up-to-n"
    | "each-model-type"
    | "conditional"
    | "this-unit"
    | "if-unit-size"
    | "unknown";

export interface TargetingDef {
    type: TargetingType;
    modelType?: string;
    count?: number;
    ratio?: number;
    maxPerRatio?: number;
    maxTotal?: number;
    condition?: TargetingCondition;
    unitSizeThreshold?: number;
}

export interface TargetingCondition {
    type: "equipped-with" | "not-equipped-with" | "already-equipped";
    weaponName?: string;
    weaponNames?: string[];
}

export type ActionType = "replace" | "add" | "unknown";

export interface ActionDef {
    type: ActionType;
    removes: WeaponRef[];
    adds: WeaponChoice[];
    isChoiceList: boolean;
}

export interface WeaponRef {
    name: string;
    count: number;
}

export interface WeaponChoice {
    weapons: WeaponRef[];
    isPackage: boolean;
}

export interface ConstraintsDef {
    restrictedWeapons?: string[];
    noDuplicates?: boolean;
    allowDuplicates?: boolean;
    mustBeDifferent?: boolean;
    maxSelections?: number;
}

export interface WargearOptionDef {
    line: number;
    rawText: string;
    wargearParsed: boolean;
    targeting: TargetingDef;
    action: ActionDef;
    constraints: ConstraintsDef;
}
