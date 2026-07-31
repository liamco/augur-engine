/**
 * Validate every mechanic in the codex — datasheet abilities, detachment
 * abilities and Enhancements.
 *
 * Run: npm run validate-mechanics
 *
 * The codex is the pipeline's single artefact: `npm run parse` writes
 * regex-derived mechanics, then the parse-ability-mechanics skill edits the same
 * files to fill the remainder. Nothing downstream validates — the engine reads
 * `ability.mechanics` and `enhancement.mechanics` straight into combat
 * resolution — so this is the last chance to catch an invalid mechanic before it
 * silently corrupts damage maths.
 *
 * Exits non-zero on any invalid mechanic.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Mechanic } from "@/app/types/Mechanic";
import {
    findInertAttributes,
    findMechanicProblems,
} from "../transforms/abilityMechanics/validate";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const FACTIONS = join(ROOT, "app/codex/factions");

/** Sources the skill may legitimately write. */
const SKILL_SOURCES = new Set(["skill", "outOfScope", "needsSchema"]);
const ALL_SOURCES = new Set(["regex", "unparsed", ...SKILL_SOURCES]);

interface Rule {
    name: string;
    type?: string;
    description?: string;
    mechanics?: Mechanic[];
    mechanicsSource?: string;
}

interface Tally {
    rules: number;
    withMechanics: number;
    bySource: Record<string, number>;
    mechanics: Mechanic[];
    problems: string[];
}

const emptyTally = (): Tally => ({
    rules: 0,
    withMechanics: 0,
    bySource: {},
    mechanics: [],
    problems: [],
});

/** Check one rule — an ability or an enhancement — and fold it into the tally. */
function checkRule(rule: Rule, where: string, tally: Tally): void {
    tally.rules++;

    const source = rule.mechanicsSource ?? "(missing)";
    tally.bySource[source] = (tally.bySource[source] ?? 0) + 1;

    if (!ALL_SOURCES.has(source)) {
        tally.problems.push(
            `${where}: mechanicsSource "${source}" is not one of ${[...ALL_SOURCES].join(", ")}`,
        );
    }

    const mechanics = rule.mechanics ?? [];
    if (mechanics.length > 0) {
        tally.withMechanics++;
        tally.mechanics.push(...mechanics);
        for (const mechanic of mechanics) {
            tally.problems.push(...findMechanicProblems(mechanic, where));
        }
    }

    // A verdict that means "looked at, deliberately empty" must not also carry
    // mechanics, and "skill" must actually carry some — otherwise the source
    // label misrepresents the data.
    if (source === "skill" && mechanics.length === 0) {
        tally.problems.push(`${where}: source "skill" but no mechanics`);
    }
    if (
        (source === "outOfScope" || source === "needsSchema") &&
        mechanics.length > 0
    ) {
        tally.problems.push(`${where}: source "${source}" must not carry mechanics`);
    }
}

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf-8"));

const factionDirs = () =>
    readdirSync(FACTIONS, { withFileTypes: true }).filter((f) => f.isDirectory());

function checkDatasheets(): { abilities: Tally; wargear: Tally } {
    const abilities = emptyTally();
    const wargear = emptyTally();

    for (const faction of factionDirs()) {
        const dir = join(FACTIONS, faction.name, "datasheets");
        if (!existsSync(dir)) continue;

        for (const file of readdirSync(dir)) {
            if (!file.endsWith(".json")) continue;
            const sheet = readJson(join(dir, file));
            const at = `${faction.name}/${file}`;

            for (const ability of (sheet.abilities ?? []) as Rule[]) {
                if (ability.type !== "Datasheet") continue;
                checkRule(ability, `${at} ${ability.name}`, abilities);
            }

            // Wargear-conferred abilities carry mechanics too, read by
            // collectWargearMechanics, so they need the same checking.
            for (const item of (sheet.wargear?.abilities ?? []) as Rule[]) {
                checkRule(item, `${at} wargear "${item.name}"`, wargear);
            }
        }
    }

    return { abilities, wargear };
}

function checkDetachments(): { abilities: Tally; enhancements: Tally } {
    const abilities = emptyTally();
    const enhancements = emptyTally();

    for (const faction of factionDirs()) {
        const dir = join(FACTIONS, faction.name, "detachments");
        if (!existsSync(dir)) continue;

        for (const file of readdirSync(dir)) {
            if (!file.endsWith(".json")) continue;
            const detachment = readJson(join(dir, file));
            const at = `${faction.name}/detachments/${file}`;

            for (const ability of (detachment.abilities ?? []) as Rule[]) {
                checkRule(ability, `${at} ability "${ability.name}"`, abilities);
            }
            for (const enhancement of (detachment.enhancements ?? []) as Rule[]) {
                checkRule(
                    enhancement,
                    `${at} enhancement "${enhancement.name}"`,
                    enhancements,
                );
            }
        }
    }

    return { abilities, enhancements };
}

function report(label: string, tally: Tally): void {
    if (tally.rules === 0) return;
    console.log(`  ${label}: ${tally.rules}, ${tally.withMechanics} with mechanics`);
    for (const [source, count] of Object.entries(tally.bySource).sort(
        (a, b) => b[1] - a[1],
    )) {
        console.log(`     ${source}: ${count}`);
    }
}

function main() {
    console.log("Validating mechanics in app/codex\n");

    const { abilities: datasheetAbilities, wargear } = checkDatasheets();
    const { abilities, enhancements } = checkDetachments();
    const all = [datasheetAbilities, wargear, abilities, enhancements];

    report("datasheet abilities", datasheetAbilities);
    report("wargear abilities", wargear);
    report("detachment abilities", abilities);
    report("enhancements", enhancements);

    // Not an error: some inert emissions are correct data waiting on the engine
    // (the damaged-profile Objective Control penalty). Surfaced so the gap
    // between "has mechanics" and "does something" stays visible.
    const inert = findInertAttributes(all.flatMap((t) => t.mechanics));
    if (inert.length > 0) {
        console.log(
            `\n  Note: attribute(s) no combat resolver reads: ${inert.join(", ")}`,
        );
    }

    const pending = all.reduce((n, t) => n + (t.bySource.unparsed ?? 0), 0);
    if (pending > 0) {
        console.log(
            `\n  Step 4 pending: ${pending} rule(s) still unparsed. Run the parse-ability-mechanics skill.`,
        );
    }

    const problems = all.flatMap((t) => t.problems);
    if (problems.length > 0) {
        console.error(`\n${problems.length} problem(s):`);
        problems.forEach((p) => console.error(`  - ${p}`));
        process.exitCode = 1;
        return;
    }
    console.log("\nAll mechanics in the codex are valid.");
}

main();
