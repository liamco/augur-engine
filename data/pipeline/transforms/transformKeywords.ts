import type { RawKeyword } from "../types";
import { parseBoolString } from "../utils/parseStats";

export interface ParsedKeyword {
    keyword: string;
    model: string;
    isFactionKeyword: boolean;
}

export function transformKeywords(raw: RawKeyword[]): ParsedKeyword[] {
    return raw.map(({ keyword, model, isFactionKeyword }) => ({
        keyword,
        model,
        isFactionKeyword: parseBoolString(isFactionKeyword),
    }));
}
