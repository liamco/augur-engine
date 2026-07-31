import { findListSize } from "./listSizes";

/**
 * Validating a list's detachment selection against its battle size.
 *
 * Pure by design — it takes a catalogue of plain objects rather than reading the
 * codex or a database. That keeps the rules logic testable with no infrastructure
 * and leaves the repository layer a thin edge around it.
 */

export interface DetachmentChoice {
    slug: string;
    name: string;
    factionSlug: string;
    /**
     * Absent or null on the 12 of 69 detachments with no `plugins.json` entry.
     * Those cannot be budget-checked, so they are refused rather than counted
     * as free — treating them as 0 would let a list bypass the budget entirely.
     */
    detachmentPoints?: number | null;
}

export type DetachmentProblem =
    | { kind: "noDetachment" }
    | { kind: "unknownListSize"; listSize: string }
    | { kind: "unknownDetachment"; slug: string }
    | { kind: "unpricedDetachment"; slug: string; name: string }
    | { kind: "wrongFaction"; slug: string; expected: string; actual: string }
    | { kind: "duplicate"; slug: string }
    | { kind: "overBudget"; spent: number; budget: number };

export interface DetachmentValidation {
    valid: boolean;
    /** Points used by the priced, in-faction, non-duplicate selections. */
    spent: number;
    budget: number;
    problems: DetachmentProblem[];
    /** Slugs the editor may still offer: this faction, priced, affordable, unselected. */
    affordable: string[];
}

export interface ValidateDetachmentsInput {
    slugs: string[];
    listSize: string;
    factionSlug: string;
    catalogue: DetachmentChoice[];
}

export function validateDetachments({
    slugs,
    listSize,
    factionSlug,
    catalogue,
}: ValidateDetachmentsInput): DetachmentValidation {
    const problems: DetachmentProblem[] = [];
    const size = findListSize(listSize);
    if (!size) problems.push({ kind: "unknownListSize", listSize });
    const budget = size?.detachmentPointBudget ?? 0;

    if (slugs.length === 0) problems.push({ kind: "noDetachment" });

    const bySlug = new Map(catalogue.map((entry) => [entry.slug, entry]));
    const counted = new Set<string>();
    let spent = 0;

    for (const slug of slugs) {
        const choice = bySlug.get(slug);
        if (!choice) {
            problems.push({ kind: "unknownDetachment", slug });
            continue;
        }

        if (choice.factionSlug !== factionSlug) {
            problems.push({
                kind: "wrongFaction",
                slug,
                expected: factionSlug,
                actual: choice.factionSlug,
            });
            continue;
        }

        // A repeat is a mistake to report, not a second charge — counting it
        // twice would produce a confusing over-budget error alongside it.
        if (counted.has(slug)) {
            problems.push({ kind: "duplicate", slug });
            continue;
        }
        counted.add(slug);

        if (choice.detachmentPoints == null) {
            problems.push({
                kind: "unpricedDetachment",
                slug,
                name: choice.name,
            });
            continue;
        }

        spent += choice.detachmentPoints;
    }

    if (size && spent > budget) {
        problems.push({ kind: "overBudget", spent, budget });
    }

    const remaining = budget - spent;
    const affordable = size
        ? catalogue
              .filter(
                  (entry) =>
                      entry.factionSlug === factionSlug &&
                      entry.detachmentPoints != null &&
                      entry.detachmentPoints <= remaining &&
                      !counted.has(entry.slug),
              )
              .map((entry) => entry.slug)
        : [];

    return { valid: problems.length === 0, spent, budget, problems, affordable };
}
