import type {
    RawFaction,
    ParsedDetachment,
    DatasheetRef,
} from "./types";
import { transformDetachments } from "./transforms/transformDetachments";

export interface ParsedFactionMeta {
    id: string;
    slug: string;
    name: string;
    /** Source snapshot the codex was built from; absent if the source omits it. */
    dataVersion?: string;
    datasheets: DatasheetRef[];
}

export interface TransformFactionResult {
    faction: ParsedFactionMeta;
    datasheetIndex: DatasheetRef[];
    detachments: ParsedDetachment[];
}

export function transformFaction(raw: RawFaction): TransformFactionResult {
    const datasheetIndex: DatasheetRef[] = raw.datasheets.map((ds) => ({
        id: ds.id,
        slug: ds.slug,
        name: ds.name,
        role: ds.role,
        isForgeWorld: ds.isForgeWorld,
        isLegends: ds.isLegends,
    }));

    // datasheetCount/detachmentCount are deliberately dropped — both derivable
    // from the arrays. link is dropped for consistency with the datasheet output.
    const faction: ParsedFactionMeta = {
        id: raw.id,
        slug: raw.slug,
        name: raw.name,
        ...(raw.dataVersion ? { dataVersion: raw.dataVersion } : {}),
        datasheets: datasheetIndex,
    };

    const detachments = transformDetachments(raw.detachments);

    return { faction, datasheetIndex, detachments };
}
