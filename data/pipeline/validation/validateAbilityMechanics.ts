/**
 * Validate every ability mechanic in the codex.
 *
 * Run: npm run validate-mechanics
 *
 * The codex is the pipeline's single artefact: `npm run parse` writes
 * regex-derived mechanics, then the parse-ability-mechanics skill edits the same
 * files to fill the remainder. Nothing downstream validates — the engine reads
 * `ability.mechanics` straight into combat resolution — so this is the last
 * chance to catch an invalid mechanic before it silently corrupts damage maths.
 *
 * Exits non-zero on any invalid mechanic.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Mechanic } from "@/app/types/Mechanic";
import { findMechanicProblems } from "../transforms/abilityMechanics/validate";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const FACTIONS = join(ROOT, "app/codex/factions");

/** Sources the skill may legitimately write. */
const SKILL_SOURCES = new Set(["skill", "outOfScope", "needsSchema"]);
const ALL_SOURCES = new Set(["regex", "unparsed", ...SKILL_SOURCES]);

interface Ability {
    name: string;
    type?: string;
    description?: string;
    mechanics?: Mechanic[];
    mechanicsSource?: string;
}

function main() {
    console.log("Validating ability mechanics in app/codex\n");

    const problems: string[] = [];
    const bySource: Record<string, number> = {};
    let abilities = 0;
    let withMechanics = 0;

    for (const faction of readdirSync(FACTIONS, { withFileTypes: true })) {
        if (!faction.isDirectory()) continue;
        const dir = join(FACTIONS, faction.name, "datasheets");
        if (!existsSync(dir)) continue;

        for (const file of readdirSync(dir)) {
            if (!file.endsWith(".json")) continue;
            const path = join(dir, file);
            const sheet = JSON.parse(readFileSync(path, "utf-8"));

            for (const ability of (sheet.abilities ?? []) as Ability[]) {
                if (ability.type !== "Datasheet") continue;
                abilities++;

                const source = ability.mechanicsSource ?? "(missing)";
                bySource[source] = (bySource[source] ?? 0) + 1;
                const where = `${faction.name}/${file} ${ability.name}`;

                if (!ALL_SOURCES.has(source)) {
                    problems.push(
                        `${where}: mechanicsSource "${source}" is not one of ${[...ALL_SOURCES].join(", ")}`,
                    );
                }

                const mechanics = ability.mechanics ?? [];
                if (mechanics.length > 0) {
                    withMechanics++;
                    for (const mechanic of mechanics) {
                        problems.push(...findMechanicProblems(mechanic, where));
                    }
                }

                // A verdict that means "looked at, deliberately empty" must not
                // also carry mechanics, and "skill" must actually carry some —
                // otherwise the source label misrepresents the data.
                if (source === "skill" && mechanics.length === 0) {
                    problems.push(`${where}: source "skill" but no mechanics`);
                }
                if (
                    (source === "outOfScope" || source === "needsSchema") &&
                    mechanics.length > 0
                ) {
                    problems.push(
                        `${where}: source "${source}" must not carry mechanics`,
                    );
                }
            }
        }
    }

    console.log(`  ${abilities} datasheet abilities, ${withMechanics} with mechanics`);
    for (const [source, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
        console.log(`     ${source}: ${count}`);
    }

    const pending = bySource.unparsed ?? 0;
    if (pending > 0) {
        console.log(
            `\n  Step 4 pending: ${pending} abilities still unparsed. Run the parse-ability-mechanics skill.`,
        );
    }

    if (problems.length > 0) {
        console.error(`\n${problems.length} problem(s):`);
        problems.forEach((p) => console.error(`  - ${p}`));
        process.exitCode = 1;
        return;
    }
    console.log("\nAll ability mechanics in the codex are valid.");
}

main();
