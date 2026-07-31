/**
 * An army list: the selections a player makes before a game.
 *
 * Everything here references the codex by id or slug rather than embedding rules
 * data. The codex is regenerated wholesale by `npm run parse` and ids do
 * disappear, so `dataVersion` records which snapshot the selections were made
 * against, and every reference is re-resolved on load.
 */

/** One unit in a list, with its chosen wargear and attachments. */
export interface ListUnitSelection {
    /** Stable within the list, so attachments can point at a specific instance. */
    instanceId: string;
    datasheetId: string;
    /** Enhancement id, only valid on a CHARACTER unit. */
    enhancementId?: string;
    /** instanceId of the unit this leader is attached to. */
    attachedTo?: string;
    /** Weapon and wargear-ability ids, as they appear in `wargear.validLoadouts`. */
    loadout: string[];
    modelCount: number;
}

export interface ListSelections {
    /** Detachment slugs. Several are legal in 11th edition, within the budget. */
    detachments: string[];
    units: ListUnitSelection[];
}

export interface ArmyList {
    id: string;
    name: string;
    factionSlug: string;
    /** A `name` from app/library/bootstrap/list-sizes.json. */
    listSize: string;
    /** `dataVersion` from the faction's faction.json when the list was saved. */
    dataVersion: string;
    selections: ListSelections;
}
