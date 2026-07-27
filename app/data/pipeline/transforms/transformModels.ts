import type { RawModel, RawUnitComposition } from "../types";
import {
    parseMovement,
    parseSkill,
    parseSaveStat,
    parseIntOrNull,
} from "../utils/parseStats";

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

function parseComposition(description: string): { min: number; max: number } {
    const match = description.match(/(\d+)(?:-(\d+))?/);
    if (!match) return { min: 1, max: 1 };
    const min = parseInt(match[1], 10);
    const max = match[2] ? parseInt(match[2], 10) : min;
    return { min, max };
}

export function transformModels(
    rawModels: RawModel[],
    rawComposition: RawUnitComposition[],
): ParsedModel[] {
    // Build composition lookup by line
    const compositionByLine = new Map<number, { min: number; max: number }>();
    for (const comp of rawComposition) {
        const line = parseInt(comp.line, 10);
        compositionByLine.set(line, parseComposition(comp.description));
    }

    return rawModels.map((model) => {
        const line = parseInt(model.line, 10);
        const composition = compositionByLine.get(line) ?? { min: 1, max: 1 };

        return {
            datasheetId: model.datasheetId,
            line,
            name: model.name,
            m: parseMovement(model.m) ?? 0,
            t: parseInt(model.t, 10),
            sv: parseSkill(model.sv) ?? 0,
            invSv: parseSaveStat(model.invSv),
            invSvDescr: model.invSvDescr,
            w: parseInt(model.w, 10),
            ld: parseSkill(model.ld) ?? 0,
            oc: parseInt(model.oc, 10),
            baseSize: model.baseSize,
            baseSizeDescr: model.baseSizeDescr,
            composition,
        };
    });
}
