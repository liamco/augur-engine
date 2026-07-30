import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

/**
 * Where the fetcher reads and writes.
 *
 * In the depot prototype these were derived per-file from `import.meta.url`
 * relative to the built `dist/` directory. Centralised here so index.ts and
 * generate-data.ts cannot disagree about the layout.
 */
const FETCH_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(FETCH_DIR, "../..");

/** Raw CSVs straight from Wahapedia, and the flat JSON tables derived from them. */
export const CACHE_DIR = join(FETCH_DIR, ".cache");
export const CSV_DIR = join(CACHE_DIR, "csv");
export const JSON_DIR = join(CACHE_DIR, "json");

/**
 * The pipeline's input — what `npm run parse` reads.
 *
 * `--out=<dir>` redirects it elsewhere, so a refresh can be staged and diffed
 * before it touches the committed source data.
 */
const outArg = process.argv.find((a) => a.startsWith("--out="));
export const FACTIONS_DIR = outArg
    ? resolve(outArg.slice("--out=".length).trim(), "factions")
    : join(ROOT, "data/src/factions");
