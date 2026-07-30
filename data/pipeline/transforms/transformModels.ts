import type { RawModel, RawUnitComposition } from "../types";
import {
    parseMovement,
    parseSkill,
    parseSaveStat,
    parseIntOrNull,
} from "../utils/parseStats";
import { parseCompositionCount } from "./transformUnitComposition";

export interface ParsedModel {
    datasheetId: string;
    line: number;
    name: string;
    m: number;
    t: number;
    sv: number;
    invSv: number | null;
    invSvDescr: string;
    w: number;
    ld: number;
    oc: number;
    baseSize: string;
    baseSizeDescr: string;
    composition: { min: number; max: number };
}

export function transformModels(
    rawModels: RawModel[],
    rawComposition: RawUnitComposition[],
): ParsedModel[] {
    // Build composition lookup by line. Only lines that actually carry a count
    // are recorded, so countless lines (e.g. an "OR" separator) fall through to
    // the default below. See transformUnitComposition for the full, unmerged
    // composition — statlines and composition lines don't map one-to-one.
    const compositionByLine = new Map<number, { min: number; max: number }>();
    for (const comp of rawComposition) {
        const line = parseInt(comp.line, 10);
        const count = parseCompositionCount(comp.description);
        if (count) compositionByLine.set(line, count);
    }

    return rawModels.map((model) => {
        const line = parseInt(model.line, 10);
        const composition = compositionByLine.get(line) ?? { min: 1, max: 1 };

        return {
            datasheetId: model.datasheetId,
            line,
            name: model.name,
            m: parseMovement(model.m) ?? 0,
            t: parseIntOrNull(model.t) ?? 0,
            sv: parseSkill(model.sv) ?? 0,
            invSv: parseSaveStat(model.invSv),
            invSvDescr: model.invSvDescr,
            w: parseIntOrNull(model.w) ?? 0,
            ld: parseSkill(model.ld) ?? 0,
            oc: parseIntOrNull(model.oc) ?? 0,
            baseSize: model.baseSize,
            baseSizeDescr: model.baseSizeDescr,
            composition,
        };
    });
}
