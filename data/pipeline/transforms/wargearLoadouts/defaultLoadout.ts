/**
 * The equipment a unit starts with, read from the datasheet's "is equipped
 * with:" prose.
 *
 * Ported from ../40k-game-buddy/scripts/regex-parsers/generate-valid-loadouts.js
 * (`parseDefaultLoadout`, `parseDefaultLoadoutStructured`), with one change:
 * an unresolvable weapon name empties the whole block rather than filling it
 * with a fabricated id. See resolveNames.
 */
import {
    parseWeaponWithCount,
    resolveNameToId,
    stripHtml,
    type NameLookup,
} from "./resolveNames";

export interface UnitCompositionLine {
    line: number;
    description: string;
    min: number;
    max: number;
}

export interface DefaultLoadoutBlock {
    raw: string;
    parsed: string[];
    byModelType: Record<string, string[]>;
}

interface ModelLoadout {
    modelType: string;
    items: { name: string; count: number }[];
}

/** The key meaning "every model in the unit shares this loadout". */
const ALL_MODELS = "*all*";

/** "4-9 Infernus Marines" → "Infernus Marine". */
export const cleanModelType = (description: string): string =>
    description
        .replace(/^\d+[-\s]*\d*\s*/, "")
        .replace(/s$/, "")
        .trim();

/**
 * Split an equipment list into weapon references.
 *
 * "nothing" is the source's way of saying a model carries no weapons — Drop
 * Pods, terrain — so it yields an empty list rather than a weapon called
 * "nothing", which is what the sibling ended up emitting ids for.
 */
const parseItems = (itemsText: string) => {
    if (/^\s*nothing\s*\.?\s*$/i.test(itemsText)) return [];
    return itemsText
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(parseWeaponWithCount);
};

/**
 * Model-type-specific loadout sentences, most specific first. Each is global
 * because a datasheet lists one per model type.
 */
const MODEL_PATTERNS = [
    /(?:The\s+)([\w\s-]+?)\s+is equipped with:\s*([^.]+)/gi,
    /(?:Each\s+)([\w\s-]+?)\s+is equipped with:\s*([^.]+)/gi,
    /(?:Every\s+)([\w\s-]+?)\s+(?:model\s+)?is equipped with:\s*([^.]+)/gi,
];

export function parseDefaultLoadout(
    raw: string,
    unitComposition: UnitCompositionLine[],
): ModelLoadout[] {
    if (!raw) return [];

    const text = stripHtml(raw);
    const loadouts: ModelLoadout[] = [];

    const add = (modelType: string, items: ModelLoadout["items"]) => {
        // An empty list is recorded, not skipped: it means "equipped with:
        // nothing", which is a complete reading. Only a pattern match calls this,
        // and every match captures at least some text, so empty arises solely
        // from that phrasing.
        //
        // The patterns overlap ("Every X" also matches "Each X"), so the first
        // reading of a model type wins.
        const seen = loadouts.some(
            (l) => l.modelType.toLowerCase() === modelType.toLowerCase(),
        );
        if (!seen) loadouts.push({ modelType, items });
    };

    for (const pattern of MODEL_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
            const named = match[1].trim();
            // A bare "model"/"models" names no type — it means all of them.
            const modelType = /^models?$/i.test(named) ? ALL_MODELS : named;
            add(modelType, parseItems(match[2].trim()));
        }
    }

    const everyModel = text.match(/Every model is equipped with:\s*([^.]+)/i);
    if (everyModel) add(ALL_MODELS, parseItems(everyModel[1].trim()));

    // "This model is equipped with:" names no model type, so the composition's
    // first line supplies one.
    if (loadouts.length === 0) {
        const generic = text.match(/equipped with:\s*([^.]+)/i);
        if (generic) {
            const first = unitComposition?.[0]?.description;
            const modelType = first ? cleanModelType(stripHtml(first)) : "any";
            add(modelType, parseItems(generic[1]));
        }
    }

    return loadouts;
}

/**
 * The `defaultLoadout` block for the codex.
 *
 * `parsed` is the flat list the engine reads: the `*all*` entry when the
 * datasheet has one, otherwise the first model type's loadout.
 */
export function buildDefaultLoadout(
    raw: string,
    lookup: NameLookup,
    unitComposition: UnitCompositionLine[],
): DefaultLoadoutBlock {
    if (!raw) return { raw: "", parsed: [], byModelType: {} };

    const loadouts = parseDefaultLoadout(raw, unitComposition);
    if (loadouts.length === 0) return { raw, parsed: [], byModelType: {} };

    const byModelType: Record<string, string[]> = {};

    for (const loadout of loadouts) {
        const ids = loadout.items.map((item) => resolveNameToId(item.name, lookup));
        // One unresolvable name means this loadout is not understood. A partial
        // list would read as a complete answer, so the whole block is dropped
        // and the datasheet reports as unparsed.
        if (ids.some((id) => id === null)) {
            return { raw, parsed: [], byModelType: {} };
        }
        byModelType[loadout.modelType] = ids as string[];
    }

    const parsed =
        byModelType[ALL_MODELS] ?? byModelType[loadouts[0].modelType] ?? [];

    return { raw, parsed, byModelType };
}
