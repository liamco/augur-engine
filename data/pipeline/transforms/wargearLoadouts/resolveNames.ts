/**
 * Turning the names in wargear prose into weapon and ability ids.
 *
 * Ported from ../40k-game-buddy/scripts/regex-parsers/generate-valid-loadouts.js
 * with one deliberate change: `resolveNameToId` returns `null` when nothing
 * matches, where the original slugged the raw text instead. That fallback put 96
 * dangling ids across 56 datasheets into the sibling's output — including whole
 * sentences and un-stripped HTML — and 68 of those datasheets still reported
 * `loadoutsParsed: true`. A null lets the caller record an honest failure.
 */

const WORD_TO_NUMBER: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
};

/** "3" → 3, "three" → 3. NaN when the text is not a number at all. */
export function parseNumber(str: string): number {
    return WORD_TO_NUMBER[str.toLowerCase().trim()] ?? parseInt(str, 10);
}

/** Strip HTML tags, which wargear option descriptions carry as <ul>/<li>. */
export function stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, "").trim();
}

/**
 * Reduce a weapon reference to just its name: drop a parenthetical aside, any
 * trailing punctuation, a leading count and a dangling conjunction.
 */
export function cleanWeaponName(name: string): string {
    return name
        .replace(/\s*\(.*?\)\s*/g, " ")
        .replace(/[.,;:*]+$/, "")
        .replace(/^\s*\d+\s+/, "")
        .replace(/\s+and\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

/** "3 heavy bolters" → { name: "heavy bolters", count: 3 }. */
export function parseWeaponWithCount(text: string): {
    name: string;
    count: number;
} {
    const trimmed = text.trim();
    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    if (match) {
        return { name: cleanWeaponName(match[2]), count: parseInt(match[1], 10) };
    }
    return { name: cleanWeaponName(trimmed), count: 1 };
}

/**
 * Drop the possessive that names *whose* weapon is being replaced — "this
 * model's heavy flamer", "each Terminator's storm bolter" — leaving the weapon.
 *
 * Longest/most specific patterns first: the ratio preamble contains a bare
 * possessive, so a looser rule matching earlier would leave the count behind.
 */
export function stripPossessivePrefix(text: string): string {
    return text
        .replace(
            /^for every \d+ models in (?:this|the) unit,?\s+\d+\s+[\w\s]+?['’]s\s+/i,
            "",
        )
        .replace(/^this model['’]s\s+/i, "")
        .replace(/^the\s+[\w\s]+?['’]s\s+/i, "")
        .replace(/^each\s+[\w\s]+?['’]s\s+/i, "")
        .replace(/^\d+\s+[\w\s]+?['’]s\s+/i, "")
        .trim();
}

export interface NameLookupEntry {
    id: string;
    name: string;
}

export interface NameLookup {
    datasheetId: string;
    weapons: NameLookupEntry[];
    abilities: NameLookupEntry[];
}

/**
 * Resolve a name from wargear prose to a real weapon or ability id.
 *
 * Always returns an id that exists on the datasheet, or `null`. Matching is
 * case-insensitive and tolerates the singular/plural mismatch between prose ("2
 * heavy bolters") and datasheet names ("Heavy bolter").
 *
 * Ids are read off the entries rather than re-derived from the name: they come
 * from the fetch stage's slug generator, which handles apostrophes and
 * collisions, and re-slugging here would drift from it.
 */
export function resolveNameToId(
    name: string,
    { weapons, abilities }: NameLookup,
): string | null {
    const normalized = normaliseName(name ?? "");
    if (!normalized) return null;

    const candidates = [normalized];
    if (normalized.endsWith("s")) candidates.push(normalized.slice(0, -1));
    else candidates.push(`${normalized}s`);

    for (const candidate of candidates) {
        const match = find(weapons, candidate) ?? find(abilities, candidate);
        if (match) return match.id;
    }

    // Datasheet entries sometimes carry a parenthetical qualifier the prose
    // omits — "Gloom prism (Aura)" referenced as "gloom prism". Tried only after
    // every exact candidate has failed, so a plainly-named entry always wins.
    for (const candidate of candidates) {
        const match =
            findStripped(weapons, candidate) ?? findStripped(abilities, candidate);
        if (match) return match.id;
    }

    return null;
}

/** Drop a trailing parenthetical: "Gloom prism (Aura)" → "gloom prism". */
const withoutParenthetical = (name: string): string =>
    normaliseName(name.replace(/\s*\([^)]*\)\s*$/, ""));

const findStripped = (entries: NameLookupEntry[], name: string) =>
    entries.find((entry) => withoutParenthetical(entry.name) === name);

/**
 * Fold the punctuation the source is inconsistent about.
 *
 * A weapon can be written "Overlord’s blade" on its own row and "Overlord's
 * blade" in the loadout prose, and dashes vary the same way. Comparing raw
 * strings misses those, which reads as an unparseable loadout.
 */
const normaliseName = (name: string): string =>
    name
        .trim()
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ");

const find = (entries: NameLookupEntry[], name: string) =>
    entries.find((entry) => normaliseName(entry.name) === name);
