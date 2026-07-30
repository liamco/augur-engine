/**
 * Turn a display name into a filename-safe slug.
 *
 * Apostrophes are removed rather than becoming a separator, so "Lion’s Blade
 * Task Force" slugs to "lions-blade-task-force" (the source's own slug dashes
 * it into "lion-s-blade-task-force"). Everything else that isn't alphanumeric
 * becomes a single dash, which keeps a hyphen already in the name intact
 * ("Rage-cursed Onslaught" → "rage-cursed-onslaught").
 */
export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
