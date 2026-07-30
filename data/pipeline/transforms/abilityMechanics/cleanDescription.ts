/**
 * Normalise an ability description for pattern matching.
 *
 * Ported from ../40k-game-buddy/scripts/regex-parsers/extract-mechanics-regex.js.
 * Descriptions arrive as Wahapedia HTML with smart quotes and en/em dashes; the
 * patterns are written against plain ASCII-ish prose, so normalise before matching.
 */
export function cleanDescription(description: string | null | undefined): string {
    if (!description || typeof description !== "string") return "";
    return description
        .replace(/<[^>]+>/g, " ")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
}
