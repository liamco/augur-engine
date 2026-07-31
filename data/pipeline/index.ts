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
import {
    applyDetachmentConfig,
    loadDetachmentConfig,
} from "./transforms/detachmentConfig";
import {
    buildDetachmentIndex,
    type DetachmentIndexInput,
} from "./transforms/detachmentIndex";
import { findInertAttributes } from "./transforms/abilityMechanics";
import type { RawDatasheet, RawFaction, ParsedStratagem } from "./types";
import type { ParsedFactionAbility } from "./transforms/transformAbilities";

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

/**
 * Accumulated per faction and written once from main(), for the same reason as
 * core stratagems: the index spans every faction, so writing it per faction
 * would leave only the last one in the file.
 */
const detachmentIndexInputs: DetachmentIndexInput[] = [];

/**
 * Ability-mechanics extraction totals across the whole run. Reported at the end
 * so a pattern silently regressing to zero matches is visible.
 */
const mechanicsTotals = { parsed: 0, unparsed: 0, perPattern: {} as Record<string, number> };

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
    const { faction, datasheetIndex, detachments } =
        transformFaction(rawFaction);

    // faction.json and the detachment files are both written *after* the
    // datasheets below: the faction's abilities and each stratagem's datasheet
    // eligibility are only known once every datasheet has been read.
    const eligibility = createEligibilityIndex();

    // Faction abilities are repeated on every datasheet that has them, so they
    // are deduped by id. Scoped to this faction, unlike core stratagems.
    const factionAbilitiesById = new Map<string, ParsedFactionAbility>();

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

        const { datasheet, coreStratagems, factionAbilities, mechanicsStats } =
            transformDatasheet(rawDatasheet);

        for (const stratagem of coreStratagems) {
            coreStratagemsById.set(stratagem.id, stratagem);
        }

        for (const ability of factionAbilities) {
            factionAbilitiesById.set(ability.id, ability);
        }

        mechanicsTotals.parsed += mechanicsStats.parsed;
        mechanicsTotals.unparsed += mechanicsStats.unparsed;
        for (const [pattern, count] of Object.entries(mechanicsStats.perPattern)) {
            mechanicsTotals.perPattern[pattern] =
                (mechanicsTotals.perPattern[pattern] ?? 0) + count;
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

    // 3. Write faction.json and the detachment files, both of which need every
    // datasheet to have been read first.
    if (validateOnly) return;

    if (values.datasheet) {
        console.log(
            "  Skipping faction.json and detachment files (single-datasheet run — abilities and eligibility would be incomplete).",
        );
        return;
    }

    writeJson(join(OUTPUT_DIR, "factions", factionSlug, "faction.json"), {
        ...faction,
        abilities: [...factionAbilitiesById.values()].sort((a, b) =>
            a.id.localeCompare(b.id),
        ),
        datasheets: datasheetIndex,
    });

    const factionOutDir = join(OUTPUT_DIR, "factions", factionSlug);
    const {
        detachments: configuredDetachments,
        unconfigured,
        unmatchedConfig,
    } = applyDetachmentConfig(
        applyEligibility(detachments, eligibility),
        loadDetachmentConfig(factionOutDir),
    );

    if (unconfigured.length > 0) {
        console.log(
            `  ${unconfigured.length} detachment(s) have no config entry (no supplement/points/disposition): ${unconfigured.join(", ")}`,
        );
    }
    if (unmatchedConfig.length > 0) {
        console.log(
            `  ${unmatchedConfig.length} config entry/entries have no detachment yet: ${unmatchedConfig.join(", ")}`,
        );
    }

    for (const det of configuredDetachments) {
        writeJson(join(factionOutDir, "detachments", `${det.slug}.json`), det);
    }

    detachmentIndexInputs.push({
        faction: {
            id: faction.id,
            slug: faction.slug,
            name: faction.name,
        },
        detachments: configuredDetachments,
    });
}

/** Report ability-mechanics extraction coverage for the run. */
function reportMechanicsCoverage() {
    const { parsed, unparsed, perPattern } = mechanicsTotals;
    const total = parsed + unparsed;
    if (total === 0) return;

    const pct = Math.round((100 * parsed) / total);
    console.log(
        `\nAbility mechanics: ${parsed}/${total} Datasheet abilities parsed (${pct}%), ${unparsed} unparsed`,
    );
    for (const [pattern, count] of Object.entries(perPattern).sort(
        (a, b) => b[1] - a[1],
    )) {
        console.log(`  ${pattern}: ${count}`);
    }

    if (unparsed > 0) {
        // This parse has just reset every ability to regex/unparsed, discarding
        // any work step 4 had written into the codex. Say so plainly: the
        // sequencing requirement is otherwise invisible until the engine
        // silently loses rules.
        console.log(
            `\n  STEP 4 PENDING — ${unparsed} abilities have no mechanics.\n` +
                `  This parse reset any previously skill-authored mechanics in the codex.\n` +
                `  Run the parse-ability-mechanics skill, then npm run validate-mechanics.`,
        );
    }
}

/**
 * Report coverage for the detachments' own rules — their abilities and their
 * Enhancements. Read straight off the parsed detachments rather than a separate
 * accumulator, since each one already carries its mechanics.
 */
function reportDetachmentMechanicsCoverage() {
    const rules = detachmentIndexInputs.flatMap(({ detachments }) =>
        detachments.flatMap((det) => [
            ...det.abilities.map((a) => ({ kind: "ability" as const, rule: a })),
            ...det.enhancements.map((e) => ({
                kind: "enhancement" as const,
                rule: e,
            })),
        ]),
    );
    if (rules.length === 0) return;

    const tally = (kind: "ability" | "enhancement") => {
        const of = rules.filter((r) => r.kind === kind);
        const parsed = of.filter((r) => r.rule.mechanics.length > 0).length;
        return { parsed, total: of.length };
    };

    const abilities = tally("ability");
    const enhancements = tally("enhancement");
    const pct = ({ parsed, total }: { parsed: number; total: number }) =>
        total === 0 ? 0 : Math.round((100 * parsed) / total);

    console.log(
        `\nDetachment mechanics:\n` +
            `  abilities:    ${abilities.parsed}/${abilities.total} parsed (${pct(abilities)}%)\n` +
            `  enhancements: ${enhancements.parsed}/${enhancements.total} parsed (${pct(enhancements)}%)`,
    );

    // Attributes no combat resolver reads. Emitting one is not an error — the
    // damaged-profile Objective Control penalty is correct data waiting on the
    // engine — but silent inert output is how coverage comes to mean nothing.
    const inert = findInertAttributes(rules.flatMap((r) => r.rule.mechanics));
    if (inert.length > 0) {
        console.log(
            `  NOTE: ${inert.length} attribute(s) emitted that no resolver reads: ${inert.join(", ")}`,
        );
    }

    const unparsed =
        abilities.total - abilities.parsed + enhancements.total - enhancements.parsed;
    if (unparsed > 0) {
        console.log(
            `\n  STEP 4 PENDING — ${unparsed} detachment rule(s) have no mechanics.\n` +
                `  This parse reset any previously skill-authored mechanics in the detachment files.\n` +
                `  Run the parse-ability-mechanics skill, then npm run reindex-detachments.`,
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

/**
 * Write the cross-faction detachment index. Skipped on a filtered run for the
 * same reason as core stratagems: only some factions were read, so the file
 * would silently lose the rest.
 */
function writeDetachmentIndex() {
    if (values.faction || values.datasheet) {
        console.log(
            "Skipping detachment-index.json (filtered run — would be incomplete).",
        );
        return;
    }
    if (detachmentIndexInputs.length === 0) return;

    const index = buildDetachmentIndex(detachmentIndexInputs);
    writeJson(join(OUTPUT_DIR, "detachment-index.json"), index);
    console.log(
        `\nDetachment index: ${index.length} detachments, ` +
            `${index.reduce((n, d) => n + d.enhancements.length, 0)} enhancements`,
    );
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

    reportMechanicsCoverage();
    reportDetachmentMechanicsCoverage();

    if (!validateOnly) {
        writeCoreStratagems();
        writeDetachmentIndex();
    }

    console.log("\nDone.");
}

main();
