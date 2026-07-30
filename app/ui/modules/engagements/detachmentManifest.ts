import detachmentIndex from "#codex/detachment-index.json";
import { Detachment, DetachmentFaction } from "#types/Detachment";

/**
 * Detachments available in the lab, read from the generated codex index rather
 * than a hand-maintained list: unlike unitManifest, which deliberately picks a
 * handful of units to test with, the detachment field is meant to show
 * everything the codex has, so it must not need editing when data arrives.
 */

const HTML_ENTITIES: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&rsquo;": "’",
    "&lsquo;": "‘",
    "&rdquo;": "”",
    "&ldquo;": "“",
    "&ndash;": "–",
    "&mdash;": "—",
    "&hellip;": "…",
};

/**
 * Strip the HTML the codex still stores in rule descriptions (keyword spans,
 * <br> breaks, the occasional table) down to readable text.
 *
 * The parse pipeline cleans descriptions before regex extraction but stores them
 * as fetched, so anything displaying one has to do this itself.
 */
export function toPlainText(html: string): string {
    return (
        html
            // Block-level markup separates words, so it becomes a space rather
            // than nothing — otherwise "First.<br><br>Second." runs together.
            .replace(/<\s*(br|\/p|\/div|\/tr|\/td|\/li|\/h\d)\s*\/?\s*>/gi, " ")
            .replace(/<[^>]*>/g, "")
            .replace(
                /&(?:nbsp|amp|lt|gt|quot|rsquo|lsquo|rdquo|ldquo|ndash|mdash|hellip);/gi,
                (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity,
            )
            .replace(/\s+/g, " ")
            .trim()
    );
}

const clean = <T extends { description?: string; legend?: string }>(item: T): T => ({
    ...item,
    ...(item.description !== undefined
        ? { description: toPlainText(item.description) }
        : {}),
    ...(item.legend !== undefined ? { legend: toPlainText(item.legend) } : {}),
});

export const detachmentManifest: Detachment[] = (
    detachmentIndex as unknown as Detachment[]
).map((det) => ({
    ...det,
    abilities: det.abilities.map(clean),
    enhancements: det.enhancements.map(clean),
}));

export interface DetachmentFactionGroup extends DetachmentFaction {
    detachments: Detachment[];
}

/**
 * The manifest grouped by faction, for rendering the field as <optgroup>s. The
 * index is already sorted by faction name then detachment name, so insertion
 * order is the display order.
 */
export const detachmentsByFaction: DetachmentFactionGroup[] = (() => {
    const groups = new Map<string, DetachmentFactionGroup>();
    for (const det of detachmentManifest) {
        const existing = groups.get(det.faction.slug);
        if (existing) {
            existing.detachments.push(det);
        } else {
            groups.set(det.faction.slug, { ...det.faction, detachments: [det] });
        }
    }
    return [...groups.values()];
})();

const bySlug = new Map(detachmentManifest.map((det) => [det.slug, det]));

export const findDetachment = (slug: string | null): Detachment | null =>
    slug ? (bySlug.get(slug) ?? null) : null;
