import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { transformDatasheet } from "./transformDatasheet";
import { transformFaction } from "./transformFaction";
import { validateDatasheet } from "./validation/validateOutput";
import type { RawDatasheet, RawFaction, ParsedStratagem } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC_DIR = join(ROOT, "data/src/factions");
const OUTPUT_DIR = join(ROOT, "app/codex");
// Legacy/duplicate source folders to skip when walking all factions.
const IGNORE_FACTIONS = new Set(["tyranids_old"]);

const { values } = parseArgs({
    options: {
        faction: { type: "string" },
        datasheet: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        validate: { type: "boolean", default: false },
    },
    strict: false,
});

const dryRun = values["dry-run"] ?? false;
const validateOnly = values.validate ?? false;

function writeJson(path: string, data: unknown) {
    if (dryRun) {
        console.log(`\n--- ${path} ---`);
        console.log(JSON.stringify(data, null, 2));
        return;
    }
    const dir = path.substring(0, path.lastIndexOf("/"));
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify(data, null, 4) + "\n");
    console.log(`  wrote ${path}`);
}

function readJson<T>(path: string): T {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function processFaction(factionSlug: string) {
    const factionDir = join(SRC_DIR, factionSlug);
    const factionPath = join(factionDir, "faction.json");

    if (!existsSync(factionPath)) {
        console.error(`  No faction.json found at ${factionPath}`);
        return;
    }

    console.log(`\nProcessing faction: ${factionSlug}`);

    // 1. Transform faction file (detachments, datasheet index)
    const rawFaction = readJson<RawFaction>(factionPath);
    const { datasheetIndex, detachments } = transformFaction(rawFaction);

    // Write faction metadata
    writeJson(join(OUTPUT_DIR, "factions", factionSlug, "faction.json"), {
        id: rawFaction.id,
        slug: rawFaction.slug,
        name: rawFaction.name,
        datasheets: datasheetIndex,
    });

    // Write detachment files
    for (const det of detachments) {
        const detSlug = det.name.toLowerCase().replace(/\s+/g, "-");
        writeJson(
            join(OUTPUT_DIR, "factions", factionSlug, "detachments", `${detSlug}.json`),
            det,
        );
    }

    // 2. Process individual datasheets
    const datasheetsDir = join(factionDir, "datasheets");
    if (!existsSync(datasheetsDir)) {
        console.log("  No datasheets directory found, skipping datasheet processing.");
        return;
    }

    const datasheetFiles = readdirSync(datasheetsDir).filter((f) => f.endsWith(".json"));
    let allCoreStratagems: ParsedStratagem[] = [];
    let coreStratagemsCaptured = false;

    for (const file of datasheetFiles) {
        if (values.datasheet && !file.startsWith(values.datasheet as string)) continue;

        const filePath = join(datasheetsDir, file);
        const rawDatasheet = readJson<RawDatasheet>(filePath);

        console.log(`  Processing datasheet: ${rawDatasheet.name} (${rawDatasheet.id})`);

        const { datasheet, coreStratagems } = transformDatasheet(rawDatasheet);

        // Capture core stratagems from first datasheet only
        if (!coreStratagemsCaptured && coreStratagems.length > 0) {
            allCoreStratagems = coreStratagems;
            coreStratagemsCaptured = true;
        }

        if (validateOnly) {
            const errors = validateDatasheet(datasheet);
            if (errors.length > 0) {
                console.error(`  VALIDATION ERRORS for ${rawDatasheet.name}:`);
                errors.forEach((e) => console.error(`    - ${e}`));
            } else {
                console.log(`  VALID: ${rawDatasheet.name}`);
            }
            continue;
        }

        writeJson(
            join(OUTPUT_DIR, "factions", factionSlug, "datasheets", file),
            datasheet,
        );
    }

    // Write core stratagems
    if (allCoreStratagems.length > 0) {
        writeJson(join(OUTPUT_DIR, "core-stratagems.json"), allCoreStratagems);
    }
}

// Main
function main() {
    console.log("Datasheet Parsing Pipeline");
    console.log("=========================");
    if (dryRun) console.log("(dry-run mode — no files will be written)\n");
    if (validateOnly) console.log("(validate mode — checking output shapes)\n");

    if (values.faction) {
        processFaction(values.faction as string);
    } else {
        // Process all factions
        if (!existsSync(SRC_DIR)) {
            console.error(`Source directory not found: ${SRC_DIR}`);
            process.exit(1);
        }
        const factions = readdirSync(SRC_DIR).filter(
            (f) =>
                !IGNORE_FACTIONS.has(f) &&
                existsSync(join(SRC_DIR, f, "faction.json")),
        );

        if (factions.length === 0) {
            console.log("No faction directories found with faction.json files.");
            console.log(`Expected structure: ${SRC_DIR}/{factionSlug}/faction.json`);
            return;
        }

        for (const faction of factions) {
            processFaction(faction);
        }
    }

    console.log("\nDone.");
}

main();
