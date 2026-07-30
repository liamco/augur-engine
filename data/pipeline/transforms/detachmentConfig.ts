import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ParsedDetachment } from "../types";
import { slugify } from "../utils/slugify";
import dispositionLibrary from "@/app/library/bootstrap/dispositions.json";

/**
 * Hand-maintained detachment facts that the fetched data cannot supply.
 *
 * Wahapedia models every supplement detachment as `faction_id=SM` with no source
 * or supplement link, and publishes no Detachment Points or Force Disposition at
 * all. Those three values are transcribed by hand into
 * `app/codex/factions/{slug}/plugins.json` and folded in here.
 *
 * The file lives inside app/codex — which the pipeline otherwise only writes —
 * precisely so it survives regeneration. If a stale-file prune step is ever added
 * to the parse, it must whitelist this file.
 */
export interface DetachmentConfigEntry {
    name: string;
    supplement: string;
    /** null for Boarding Actions detachments, which have no DP cost. */
    detachmentPoints: number | null;
    /** Title case as printed by the source article, e.g. "Priority Assets". */
    disposition: string | null;
}

interface DetachmentConfigFile {
    faction?: string;
    detachmentConfig?: Record<string, DetachmentConfigEntry>;
}

const CONFIG_FILENAME = "plugins.json";

const VALID_DISPOSITIONS: ReadonlySet<string> = new Set(
    (dispositionLibrary as { dispositions: string[] }).dispositions,
);

/**
 * Load a faction's detachment config. Returns an empty map when the faction has
 * no config file — only space-marines needs one, since the other factions have no
 * supplements.
 */
export function loadDetachmentConfig(
    factionDir: string,
): Map<string, DetachmentConfigEntry> {
    const path = join(resolve(factionDir), CONFIG_FILENAME);
    if (!existsSync(path)) return new Map();

    const parsed = JSON.parse(
        readFileSync(path, "utf-8"),
    ) as DetachmentConfigFile;

    return new Map(Object.entries(parsed.detachmentConfig ?? {}));
}

/**
 * Normalise a disposition to the library's slug. The config carries the source
 * article's wording so it stays cheap to re-verify; the codex emits the library
 * value so consumers have one canonical form.
 */
function toDispositionSlug(disposition: string, detachmentSlug: string): string {
    const slug = slugify(disposition);
    if (!VALID_DISPOSITIONS.has(slug)) {
        throw new Error(
            `Unknown disposition "${disposition}" (slug "${slug}") on detachment "${detachmentSlug}". ` +
                `Expected one of: ${[...VALID_DISPOSITIONS].join(", ")}`,
        );
    }
    return slug;
}

export interface ApplyDetachmentConfigResult {
    detachments: ParsedDetachment[];
    /** Detachments with no config entry — left without the extra fields. */
    unconfigured: string[];
    /** Config entries with no matching detachment, e.g. not yet in the source. */
    unmatchedConfig: string[];
}

export function applyDetachmentConfig(
    detachments: ParsedDetachment[],
    config: Map<string, DetachmentConfigEntry>,
): ApplyDetachmentConfigResult {
    const unconfigured: string[] = [];
    const matched = new Set<string>();

    const out = detachments.map((det) => {
        const entry = config.get(det.slug);
        if (!entry) {
            unconfigured.push(det.slug);
            return det;
        }

        matched.add(det.slug);
        return {
            ...det,
            supplement: entry.supplement,
            detachmentPoints: entry.detachmentPoints,
            disposition: entry.disposition
                ? toDispositionSlug(entry.disposition, det.slug)
                : null,
        };
    });

    return {
        detachments: out,
        unconfigured,
        unmatchedConfig: [...config.keys()]
            .filter((slug) => !matched.has(slug))
            .sort(),
    };
}
