export interface Weapon {
    name: string;
    datasheetId: string;
    id: string;
    type: "Ranged" | "Melee";
    profiles: WeaponProfile[];
    eligibility?: EligibilityRule[];
    count?: number;
    sourceUnitName?: string;
}

export interface WeaponProfile {
    datasheetId: string;
    line: number;
    lineInWargear?: number;
    name: string;
    attributes: string[];
    a: string | number;
    ap: number;
    bsWs: number | string;
    d: string | number;
    s: number;
    range: number | string;
}

export type EligibilityRuleType = "any" | "modelType" | "ratio" | "count";

export interface EligibilityRuleBase {
    type: EligibilityRuleType;
}

export interface EligibilityRuleAny extends EligibilityRuleBase {
    type: "any";
}

export interface EligibilityRuleModelType extends EligibilityRuleBase {
    type: "modelType";
    modelType: string[];
}

export interface EligibilityRuleRatio extends EligibilityRuleBase {
    type: "ratio";
    ratio: number;
    count: number;
    modelType?: string[];
}

export interface EligibilityRuleCount extends EligibilityRuleBase {
    type: "count";
    count: number;
    modelType?: string[];
}

export type EligibilityRule =
    | EligibilityRuleAny
    | EligibilityRuleModelType
    | EligibilityRuleRatio
    | EligibilityRuleCount;
