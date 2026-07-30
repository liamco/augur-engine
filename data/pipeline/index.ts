import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { transformDatasheet } from "./transformDatasheet";
import { transformFaction } from "./transformFaction";
import { validateDatasheet } from "./validation/validateOutput";
import {
    applyEligibility,
    createEligibilityIndex,
    recordDatasheetEligibility,
} from "./transforms/eligibility";
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

/**
 * Core stratagems are duplicated onto every datasheet in the source, so they are
 * accumulated across the whole run (deduped by id) and written once from main().
 * Writing per faction would leave whichever faction happened to be processed
 * last as the file's contents.
 */
const coreStratagemsById = new Map<string, ParsedStratagem>();

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
    const { faction, detachments } = transformFaction(rawFaction);

    // Write faction metadata
    writeJson(
        join(OUTPUT_DIR, "factions", factionSlug, "faction.json"),
        faction,
    );

    // Detachment files are written *after* the datasheets below: datasheet
    // eligibility for each stratagem/enhancement/ability is only known once
    // every datasheet in the faction has been read.
    const eligibility = createEligibilityIndex();

    // 2. Process individual datasheets
    const datasheetsDir = join(factionDir, "datasheets");
    if (!existsSync(datasheetsDir)) {
        console.log("  No datasheets directory found, skipping datasheet processing.");
        return;
    }

    const datasheetFiles = readdirSync(datasheetsDir).filter((f) => f.endsWith(".json"));

    for (const file of datasheetFiles) {
        if (values.datasheet && !file.startsWith(values.datasheet as string)) continue;

        const filePath = join(datasheetsDir, file);
        const rawDatasheet = readJson<RawDatasheet>(filePath);

        console.log(`  Processing datasheet: ${rawDatasheet.name} (${rawDatasheet.id})`);

        const { datasheet, coreStratagems } = transformDatasheet(rawDatasheet);

        for (const stratagem of coreStratagems) {
            coreStratagemsById.set(stratagem.id, stratagem);
        }

        recordDatasheetEligibility(eligibility, rawDatasheet);

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

    // 3. Write detachment files, now annotated with datasheet eligibility.
    if (validateOnly) return;

    if (values.datasheet) {
        console.log(
            "  Skipping detachment files (single-datasheet run — eligibility would be incomplete).",
        );
        return;
    }

    for (const det of applyEligibility(detachments, eligibility)) {
        writeJson(
            join(OUTPUT_DIR, "factions", factionSlug, "detachments", `${det.slug}.json`),
            det,
        );
    }
}

/**
 * Write the accumulated core stratagems. Skipped on a filtered run, where only a
 * subset of datasheets was read and writing would truncate the file.
 */
function writeCoreStratagems() {
    if (values.faction || values.datasheet) {
        console.log(
            "\nSkipping core-stratagems.json (filtered run — would be incomplete).",
        );
        return;
    }
    if (coreStratagemsById.size === 0) return;

    const sorted = [...coreStratagemsById.values()].sort((a, b) =>
        a.id.localeCompare(b.id),
    );
    writeJson(join(OUTPUT_DIR, "core-stratagems.json"), sorted);
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

    if (!validateOnly) writeCoreStratagems();

    console.log("\nDone.");
}

main();
