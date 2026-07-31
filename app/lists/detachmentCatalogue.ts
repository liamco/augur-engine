import { detachmentManifest } from "#modules/Engagements/detachmentManifest";
import type { DetachmentChoice } from "./validateDetachments";

/**
 * Every detachment a list may choose from, flattened out of the generated codex
 * index into the plain shape the validator wants.
 *
 * This is the seam between the codex and the pure rules logic: the validator
 * never imports codex data itself, so it stays testable against fixtures while
 * this module keeps one place where the real data is read.
 */
export const detachmentCatalogue: DetachmentChoice[] = detachmentManifest.map(
    (detachment) => ({
        slug: detachment.slug,
        name: detachment.name,
        factionSlug: detachment.faction.slug,
        detachmentPoints: detachment.detachmentPoints,
    }),
);
