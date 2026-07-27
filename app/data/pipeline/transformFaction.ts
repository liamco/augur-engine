import type {
    RawFaction,
    ParsedDetachment,
    DatasheetRef,
} from "./types";
import { transformDetachments } from "./transforms/transformDetachments";

export interface TransformFactionResult {
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

    const detachments = transformDetachments(raw.detachments);

    return { datasheetIndex, detachments };
}
