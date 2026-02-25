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
    slug: string;
    faction: {
        id: string;
        slug: string;
    };
    source: {
        id: string;
        name: string;
    };
    role: string;
    legend?: string;
    transport?: string;
    abilities?: Ability[];
    factionAbilityIds?: string[];
    keywords?: any[];
    models?: ModelDatasheet[];
    isForgeWorld?: boolean;
    isLegends?: boolean;
    modelInstances?: ModelInstance[];
    combatState: CombatState;
    sourceUnits?: SourceUnit[];
    enhancement?: Enhancement;
    supplement?: SupplementData;
    damaged?: DamagedProfile | null;
    leader?: {
        canLead: { id: string; slug: string }[];
        leaderNotes: string;
    } | null;
    wargear: Weapon[];

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
