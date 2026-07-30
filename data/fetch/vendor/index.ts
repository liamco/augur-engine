/**
 * Vendored slice of @depot/core.
 *
 * The fetcher was migrated from the depot prototype, where it imported from the
 * `@depot/core` workspace package. Only three runtime symbols were ever reached
 * — `slug.createSlugGenerator`, `wargear.groupWargearProfiles` and `sortByName`
 * — plus the two type namespaces. Those files are copied under vendor/ so
 * data/fetch is self-contained, and this barrel reproduces the shape the
 * migrated code imports.
 *
 * Not vendored (unused by the fetcher): roster, collection, paths, breadcrumbs,
 * keywords, enhancements, faction, abilities and datasheets helpers.
 */

export * as depot from "./types/depot";
export * as wahapedia from "./types/wahapedia";
export * as slug from "./utils/slug";
export * as wargear from "./utils/wargear";
export { sortByName } from "./utils/array";
