import { ModelDatasheet, ModelInstance } from "./Model";
import { Ability } from "./Ability";
import { DamagedProfile } from "./Damaged";
import { LeaderData } from "./Leader";
import { Weapon } from "./Weapon";
import { CombatState } from "./State";
import { Enhancement } from "./Enhancement";

export type Unit = {
    id: string;
    name: string;
    factionId: string;
    slug: string;
    factionSlug: string;
    role: string;
    roleLabel: string;
    legend?: string;
    transport?: string;
    abilities?: Ability[];
    factionAbilityIds?: string[];
    keywords?: any[];
    models?: ModelDatasheet[];
    unitComposition?: any[];
    modelCosts?: {
        datasheetId: string;
        line: number;
        description: string;
        cost: number;
        count: number;
    }[];
    isForgeWorld?: boolean;
    isLegends?: boolean;
    modelInstances?: ModelInstance[];
    combatState: CombatState;
    sourceUnits?: SourceUnit[];
    enhancement?: Enhancement;
    supplement?: SupplementData;
    damaged?: DamagedProfile | null;
    leader?: LeaderData | null;
    wargear: Weapon[];
    leadsUnits?: {
        id: string;
        slug: string;
    }[];

    [key: string]: any;
};

export interface SupplementData {
    key: string;
    slug: string;
    name: string;
    label: string;
    isSupplement: boolean;
}

export interface SourceUnit {
    listItemId: string;
    datasheetId: string;
    name: string;
    isLeader: boolean;
}
