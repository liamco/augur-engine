import { Attribute, Effect } from "./Mechanic";

export type MechanicLayer =
    | "weaponAttribute"
    | "unitAbility"
    | "leaderAbility"
    | "enhancement"
    | "stratagem"
    | "detachmentRule"
    | "armyRule"
    | "damagedProfile"
    | "wargearAbility";

export interface MechanicSource {
    mechanicName?: string;
    layer: MechanicLayer;
    effect: Effect;
    originalValue: boolean | number | string;
}

export interface RerollRule {
    scope: "all" | "ones" | "failures";
}

export interface MortalWoundRule {
    count: number | string;
    inAddition: boolean;
}

export interface ResolvedEffectSet {
    rollBonus?: number;
    rollPenalty?: number;
    autoSuccess?: boolean;
    reroll?: RerollRule;
    mortalWounds?: MortalWoundRule;
    ignoreBehaviour?: boolean;
    ignoreModifier?: boolean;
    halveDamage?: boolean;
    minDamage?: number;
    setsFnp?: number;
    staticNumber?: number;
    rollBlock?: boolean;
    sources: MechanicSource[];
}

export type ResolvedModifiers = Map<Attribute, ResolvedEffectSet>;
