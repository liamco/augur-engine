import type { ListSelections, ListUnitSelection } from "@/app/types/List";
import { findListSize } from "./listSizes";

/**
 * Validating what arrives over HTTP before it reaches the database.
 *
 * Hand-written rather than pulled from a schema library: the shape is small, this
 * keeps the dependency count down, and the errors can be phrased for the editor
 * that will show them. Pure, so it is tested without a server or a database.
 */

export interface ListInput {
    name: string;
    factionSlug: string;
    listSize: string;
    dataVersion: string;
    selections: ListSelections;
}

export type ParseResult<T> =
    | { ok: true; value: T }
    | { ok: false; errors: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

function parseUnit(raw: unknown, index: number, errors: string[]): ListUnitSelection | null {
    if (!isRecord(raw)) {
        errors.push(`selections.units[${index}] must be an object`);
        return null;
    }

    const at = `selections.units[${index}]`;
    if (!nonEmptyString(raw.instanceId)) errors.push(`${at}.instanceId is required`);
    if (!nonEmptyString(raw.datasheetId)) errors.push(`${at}.datasheetId is required`);
    if (!Array.isArray(raw.loadout) || raw.loadout.some((x) => typeof x !== "string")) {
        errors.push(`${at}.loadout must be an array of ids`);
    }
    if (typeof raw.modelCount !== "number" || !Number.isInteger(raw.modelCount) || raw.modelCount < 1) {
        errors.push(`${at}.modelCount must be a whole number of at least 1`);
    }
    if (raw.enhancementId !== undefined && !nonEmptyString(raw.enhancementId)) {
        errors.push(`${at}.enhancementId must be an id when present`);
    }
    if (raw.attachedTo !== undefined && !nonEmptyString(raw.attachedTo)) {
        errors.push(`${at}.attachedTo must be an instanceId when present`);
    }

    if (errors.length > 0) return null;

    return {
        instanceId: raw.instanceId as string,
        datasheetId: raw.datasheetId as string,
        loadout: raw.loadout as string[],
        modelCount: raw.modelCount as number,
        ...(raw.enhancementId ? { enhancementId: raw.enhancementId as string } : {}),
        ...(raw.attachedTo ? { attachedTo: raw.attachedTo as string } : {}),
    };
}

function parseSelections(raw: unknown, errors: string[]): ListSelections | null {
    if (!isRecord(raw)) {
        errors.push("selections must be an object");
        return null;
    }

    if (!Array.isArray(raw.detachments) || raw.detachments.some((x) => typeof x !== "string")) {
        errors.push("selections.detachments must be an array of slugs");
    }
    if (!Array.isArray(raw.units)) {
        errors.push("selections.units must be an array");
        return null;
    }

    const units = (raw.units as unknown[]).map((unit, i) => parseUnit(unit, i, errors));
    if (errors.length > 0) return null;

    // An attachment pointing at a unit that is not in the list would silently
    // detach on load, so it is rejected here instead.
    const ids = new Set(units.map((u) => u!.instanceId));
    for (const unit of units) {
        if (unit!.attachedTo && !ids.has(unit!.attachedTo)) {
            errors.push(
                `selections.units[${unit!.instanceId}].attachedTo "${unit!.attachedTo}" is not a unit in this list`,
            );
        }
    }
    const duplicates = units.length - ids.size;
    if (duplicates > 0) errors.push("selections.units contains duplicate instanceIds");

    if (errors.length > 0) return null;

    return {
        detachments: raw.detachments as string[],
        units: units as ListUnitSelection[],
    };
}

export function parseListInput(body: unknown): ParseResult<ListInput> {
    const errors: string[] = [];

    if (!isRecord(body)) {
        return { ok: false, errors: ["body must be a JSON object"] };
    }

    if (!nonEmptyString(body.name)) errors.push("name is required");
    if (!nonEmptyString(body.factionSlug)) errors.push("factionSlug is required");
    if (!nonEmptyString(body.dataVersion)) errors.push("dataVersion is required");

    if (!nonEmptyString(body.listSize)) {
        errors.push("listSize is required");
    } else if (!findListSize(body.listSize)) {
        // Checked against the library rather than accepted blindly: an unknown
        // size has no budget, so nothing downstream could validate the list.
        errors.push(`listSize "${body.listSize}" is not a known battle size`);
    }

    const selections = parseSelections(body.selections, errors);

    if (errors.length > 0) return { ok: false, errors };

    return {
        ok: true,
        value: {
            name: (body.name as string).trim(),
            factionSlug: body.factionSlug as string,
            listSize: body.listSize as string,
            dataVersion: body.dataVersion as string,
            selections: selections as ListSelections,
        },
    };
}
