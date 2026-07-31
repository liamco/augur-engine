/**
 * Write one coverage report per rule category into `.claude/coverage/`.
 *
 *   npm run coverage-report
 *
 * The reports are a work queue for the parse-ability-mechanics skill: every rule
 * the regex layer could not convert, grouped by rules text so one entry means one
 * edit however many files share it, ordered by leverage.
 *
 * Generated rather than hand-written because `npm run parse` rewrites the codex
 * and resets every rule to regex/unparsed — a static report would be stale the
 * moment the data changed.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanDescription } from "../transforms/abilityMechanics";
import {
    groupUnparsed,
    summarise,
    type RuleRecord,
    type UnparsedGroup,
} from "./groupUnparsed";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const FACTIONS = join(ROOT, "app/codex/factions");
const OUT_DIR = join(ROOT, ".claude/coverage");

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf-8"));

const factionDirs = () =>
    readdirSync(FACTIONS, { withFileTypes: true })
        .filter((f) => f.isDirectory())
        .map((f) => f.name);

const jsonFiles = (dir: string) =>
    existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];

interface RawRule {
    name: string;
    type?: string;
    description?: string;
    mechanics?: unknown[];
    mechanicsSource?: string;
}

const toRecord = (rule: RawRule, owner: string): RuleRecord => ({
    name: rule.name,
    description: cleanDescription(rule.description) ?? "",
    owner,
    mechanicsSource: rule.mechanicsSource ?? "(no mechanicsSource field)",
    hasMechanics: (rule.mechanics?.length ?? 0) > 0,
});

/* ── collectors, one per category ──────────────────────────────────── */

function collectFromDatasheets(
    pick: (sheet: Record<string, never>) => RawRule[],
): RuleRecord[] {
    const records: RuleRecord[] = [];
    for (const faction of factionDirs()) {
        const dir = join(FACTIONS, faction, "datasheets");
        for (const file of jsonFiles(dir)) {
            const sheet = readJson(join(dir, file));
            for (const rule of pick(sheet) ?? []) {
                records.push(toRecord(rule, sheet.name));
            }
        }
    }
    return records;
}

const unitAbilities = () =>
    collectFromDatasheets((s) =>
        ((s as unknown as { abilities?: RawRule[] }).abilities ?? []).filter(
            (a) => a.type === "Datasheet",
        ),
    );

const wargearAbilities = () =>
    collectFromDatasheets(
        (s) =>
            (s as unknown as { wargear?: { abilities?: RawRule[] } }).wargear
                ?.abilities ?? [],
    );

function collectFromDetachments(key: "abilities" | "enhancements"): RuleRecord[] {
    const records: RuleRecord[] = [];
    for (const faction of factionDirs()) {
        const dir = join(FACTIONS, faction, "detachments");
        for (const file of jsonFiles(dir)) {
            const detachment = readJson(join(dir, file));
            for (const rule of (detachment[key] ?? []) as RawRule[]) {
                records.push(toRecord(rule, detachment.name));
            }
        }
    }
    return records;
}

/**
 * Faction-wide rules — Oath of Moment, Synapse — held once on faction.json
 * rather than repeated across every datasheet that has them.
 *
 * These carry no `mechanics` field at all: nothing has ever extracted them, and
 * the engine's army layer (`collectArmyMechanics`) is fed from the combat context
 * rather than the codex.
 */
function armyAbilities(): RuleRecord[] {
    const records: RuleRecord[] = [];
    for (const faction of factionDirs()) {
        const path = join(FACTIONS, faction, "faction.json");
        if (!existsSync(path)) continue;
        const data = readJson(path);
        for (const rule of (data.abilities ?? []) as RawRule[]) {
            records.push(toRecord(rule, data.name));
        }
    }
    return records;
}

/* ── rendering ─────────────────────────────────────────────────────── */

interface ReportSpec {
    file: string;
    title: string;
    /** What these rules are and where they live. */
    blurb: string;
    ownerLabel: string;
    collect: () => RuleRecord[];
}

const REPORTS: ReportSpec[] = [
    {
        file: "unit-abilities.md",
        title: "Unit abilities",
        blurb:
            "Bespoke datasheet abilities (`type: \"Datasheet\"`), in " +
            "`app/codex/factions/*/datasheets/*.json` → `abilities[]`. Read by " +
            "`collectUnitMechanics`.",
        ownerLabel: "Datasheets",
        collect: unitAbilities,
    },
    {
        file: "enhancements.md",
        title: "Enhancements",
        blurb:
            "Detachment Enhancements, in `app/codex/factions/*/detachments/*.json` → " +
            "`enhancements[]`. Read by `collectEnhancementMechanics`. Bearer-scoped: " +
            "an effect on the bearer alone needs the single-model condition.",
        ownerLabel: "Detachments",
        collect: () => collectFromDetachments("enhancements"),
    },
    {
        file: "detachment-abilities.md",
        title: "Detachment abilities",
        blurb:
            "A detachment's own rules, in `app/codex/factions/*/detachments/*.json` → " +
            "`abilities[]`. Read by `collectDetachmentMechanics`. These apply to units " +
            "from your army, so they are unit-scoped by default.",
        ownerLabel: "Detachments",
        collect: () => collectFromDetachments("abilities"),
    },
    {
        file: "army-abilities.md",
        title: "Army abilities",
        blurb:
            "Faction-wide rules (Oath of Moment, Synapse), held once on " +
            "`app/codex/factions/*/faction.json` → `abilities[]`.",
        ownerLabel: "Factions",
        collect: armyAbilities,
    },
    {
        file: "wargear-abilities.md",
        title: "Wargear abilities",
        blurb:
            "Abilities conferred by a piece of wargear — a storm shield, a " +
            "resurrection orb — in `app/codex/factions/*/datasheets/*.json` → " +
            "`wargear.abilities[]`. Read by `collectWargearMechanics`. Bearer-scoped, " +
            "and their ids are what loadout references resolve to, so never change an id.",
        ownerLabel: "Datasheets",
        collect: wargearAbilities,
    },
];

/**
 * Whether a group is still awaiting a decision, as opposed to one the skill has
 * already ruled out. Army abilities have no `mechanicsSource` field at all, which
 * counts as untriaged.
 */
const isUntriaged = (group: UnparsedGroup): boolean =>
    group.mechanicsSource === "unparsed" ||
    group.mechanicsSource === "(no mechanicsSource field)";

/** Fence the description so pipes and HTML in rules text cannot break the page. */
const asBlock = (text: string) => (text ? `\n\`\`\`\n${text}\n\`\`\`\n` : "\n_(no description in the source)_\n");

function renderGroup(group: UnparsedGroup, ownerLabel: string): string {
    const owners =
        group.owners.length > 6
            ? `${group.owners.slice(0, 6).join(", ")} … and ${group.owners.length - 6} more`
            : group.owners.join(", ");

    const verdict = isUntriaged(group)
        ? ""
        : ` — already triaged as \`${group.mechanicsSource}\``;

    return [
        `### ${group.name}${verdict}`,
        "",
        `${group.count} occurrence${group.count === 1 ? "" : "s"} · ${ownerLabel}: ${owners}`,
        asBlock(group.description),
    ].join("\n");
}

function render(spec: ReportSpec, date: string): string {
    const rules = spec.collect();
    const summary = summarise(rules);
    const groups = groupUnparsed(rules);

    const sources = Object.entries(summary.bySource)
        .sort((a, b) => b[1] - a[1])
        .map(([source, count]) => `| \`${source}\` | ${count} |`)
        .join("\n");

    const todo = groups.filter(isUntriaged);
    const triaged = groups.filter((g) => !isUntriaged(g));

    const body = todo.length === 0
        ? "\n_Nothing left to convert._\n"
        : `\n${todo.map((g) => renderGroup(g, spec.ownerLabel)).join("\n")}`;

    return [
        `# Coverage — ${spec.title}`,
        "",
        `_Generated ${date} by \`npm run coverage-report\`. Do not edit by hand — it is rewritten from the codex._`,
        "",
        spec.blurb,
        "",
        "## Headline",
        "",
        `- **Total:** ${summary.total}`,
        `- **With mechanics:** ${summary.withMechanics} (${summary.coverage}%)`,
        `- **Still to convert:** ${summary.total - summary.withMechanics}, which is **${todo.length} distinct rules text${todo.length === 1 ? "" : "s"}** once repeats are folded together.`,
        "",
        "| `mechanicsSource` | Count |",
        "|---|---|",
        sources || "| _none_ | 0 |",
        "",
        "Grouped by rules text and ordered by how many files share it, so the entry at",
        "the top is the one worth doing first. Edit every listed owner, or the rule will",
        "behave differently between units.",
        "",
        "---",
        "",
        `## To convert (${todo.length})`,
        body,
        ...(triaged.length > 0
            ? [
                  "---",
                  "",
                  `## Already triaged (${triaged.length})`,
                  "",
                  "Deliberately left without mechanics. Listed so the same judgement is not",
                  "made twice — `outOfScope` means not combat resolution, `needsSchema` means",
                  "combat but inexpressible.",
                  "",
                  ...triaged.map((g) => renderGroup(g, spec.ownerLabel)),
              ]
            : []),
    ].join("\n");
}

function main() {
    if (!existsSync(FACTIONS)) {
        console.error(`No codex found at ${FACTIONS}. Run npm run parse first.`);
        process.exitCode = 1;
        return;
    }

    mkdirSync(OUT_DIR, { recursive: true });
    // Passed in rather than read from the clock so a rerun on unchanged data
    // produces an unchanged file.
    const date = process.env.REPORT_DATE ?? new Date().toISOString().slice(0, 10);

    console.log("Coverage reports\n");
    for (const spec of REPORTS) {
        const rules = spec.collect();
        const summary = summarise(rules);
        const path = join(OUT_DIR, spec.file);
        writeFileSync(path, render(spec, date));
        console.log(
            `  ${spec.file.padEnd(26)} ${summary.withMechanics}/${summary.total} ` +
                `(${summary.coverage}%) — ${groupUnparsed(rules).length} distinct left`,
        );
    }
    console.log(`\nWrote ${REPORTS.length} reports to .claude/coverage/`);
}

main();
