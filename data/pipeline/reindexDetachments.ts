/**
 * Rebuild `app/codex/detachment-index.json` from the codex detachment files.
 *
 * `npm run parse` writes the index from the source data it just transformed. The
 * parse-ability-mechanics skill, though, edits the *codex* detachment files in
 * place — and the app reads enhancements through the index, so without this the
 * skill's work would never reach the engine. Re-running a full parse is not an
 * option: it would overwrite the very edits being published.
 *
 * This re-derives the index from the codex instead of from source, using the same
 * buildDetachmentIndex as the parse. That is what makes the index a projection
 * rather than a second source of truth: on an unmodified codex it is a no-op.
 *
 *   npm run reindex-detachments
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
    buildDetachmentIndex,
    type DetachmentIndexInput,
} from "./transforms/detachmentIndex";
import type { ParsedDetachment } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CODEX = join(ROOT, "app/codex");
const FACTIONS = join(CODEX, "factions");
const INDEX_PATH = join(CODEX, "detachment-index.json");

interface CodexFaction {
    id: string;
    slug: string;
    name: string;
}

const readJson = <T,>(path: string): T =>
    JSON.parse(readFileSync(path, "utf-8")) as T;

function collectInputs(): DetachmentIndexInput[] {
    const inputs: DetachmentIndexInput[] = [];

    for (const entry of readdirSync(FACTIONS, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;

        const factionPath = join(FACTIONS, entry.name, "faction.json");
        const detachmentsDir = join(FACTIONS, entry.name, "detachments");
        if (!existsSync(factionPath) || !existsSync(detachmentsDir)) continue;

        const { id, slug, name } = readJson<CodexFaction>(factionPath);
        const detachments = readdirSync(detachmentsDir)
            .filter((file) => file.endsWith(".json"))
            .map((file) =>
                readJson<ParsedDetachment>(join(detachmentsDir, file)),
            );

        if (detachments.length === 0) continue;
        inputs.push({ faction: { id, slug, name }, detachments });
    }

    return inputs;
}

function main() {
    const check = process.argv.includes("--check");

    const inputs = collectInputs();
    if (inputs.length === 0) {
        console.error(`No detachments found under ${FACTIONS}. Run npm run parse first.`);
        process.exitCode = 1;
        return;
    }

    const index = buildDetachmentIndex(inputs);
    const next = JSON.stringify(index, null, 4) + "\n";
    const current = existsSync(INDEX_PATH)
        ? readFileSync(INDEX_PATH, "utf-8")
        : null;

    const withMechanics = index.reduce(
        (n, det) =>
            n +
            det.abilities.filter((a) => (a.mechanics?.length ?? 0) > 0).length +
            det.enhancements.filter((e) => (e.mechanics?.length ?? 0) > 0).length,
        0,
    );

    if (current === next) {
        console.log(
            `detachment-index.json already up to date ` +
                `(${index.length} detachments, ${withMechanics} rules with mechanics).`,
        );
        return;
    }

    if (check) {
        console.error(
            "detachment-index.json is stale — run npm run reindex-detachments.",
        );
        process.exitCode = 1;
        return;
    }

    writeFileSync(INDEX_PATH, next);
    console.log(
        `Rewrote detachment-index.json ` +
            `(${index.length} detachments, ${withMechanics} rules with mechanics).`,
    );
}

main();
