import type { Mechanic } from "@/app/types/Mechanic";
import type { RawAbility } from "../types";
import {
    cleanDescription,
    extractAbilityMechanics,
    extractDetachmentRuleMechanics,
} from "./abilityMechanics";
import { slugify } from "../utils/slugify";

/**
 * How an ability's `mechanics` was produced.
 *
 * The parse only ever emits "regex" or "unparsed". The remaining values are
 * written into the codex afterwards by the parse-ability-mechanics skill (step 4
 * of fetch -> parse -> regex -> skill), which edits the datasheet files in place.
 *
 * NOTE: re-running `npm run parse` resets every ability to regex/unparsed and
 * discards step 4's work. That is the accepted cost of keeping the codex the
 * single artefact, with no hand-authored side files to drift out of sync. The
 * parse prints how many abilities remain unparsed so the pending step is visible.
 */
export type MechanicsSource =
    | "regex"
    | "unparsed"
    | "skill"
    | "outOfScope"
    | "needsSchema";

export interface ParsedWargearAbility {
    /** `{datasheetId}:{slug}` — what a loadout reference resolves to. */
    id: string;
    name: string;
    description: string;
    mechanics: Mechanic[];
    mechanicsSource: MechanicsSource;
}

export interface ParsedAbilityCore {
    // Shared definition id — one per rule across every datasheet that has it
    // (000008343 = Deep Strike, 000008350 = Oath of Moment). A stable join key
    // to the library. The source leaves it blank on bespoke abilities, so it is
    // only emitted where present.
    id?: string;
    name: string;
    type: "Core" | "Faction";
    parameter?: number;
}

export interface ParsedAbilityDatasheet {
    name: string;
    legend: string;
    description: string;
    type: "Datasheet";
    parameter: string | null;
    mechanics: Mechanic[];
    /**
     * How `mechanics` was produced. "regex" means the extractor matched a
     * high-reliability pattern; "unparsed" means it declined and the rules text
     * has not been converted. Gives the follow-up skill a durable work queue and
     * lets consumers tell machine-derived from hand-verified.
     */
    mechanicsSource: MechanicsSource;
}

export type ParsedAbility = ParsedAbilityCore | ParsedAbilityDatasheet;

/**
 * Extraction counts for one datasheet's abilities, for the parse's coverage
 * report. Silent partial extraction is the failure mode to avoid: without this,
 * a pattern regressing to zero matches would look identical to a corpus that
 * simply has nothing to match.
 */
export function summariseAbilityMechanics(raw: RawAbility[]): {
    parsed: number;
    unparsed: number;
    perPattern: Record<string, number>;
} {
    let parsed = 0;
    let unparsed = 0;
    const perPattern: Record<string, number> = {};

    for (const ability of raw) {
        if (ability?.type !== "Datasheet") continue;
        const { mechanics, matchedPatterns } = extractAbilityMechanics(
            ability.name,
            ability.description,
        );
        if (mechanics.length > 0) {
            parsed++;
            for (const pattern of matchedPatterns) {
                perPattern[pattern] = (perPattern[pattern] ?? 0) + 1;
            }
        } else {
            unparsed++;
        }
    }

    return { parsed, unparsed, perPattern };
}

/**
 * A Faction ability's rules text, stored on the owning faction.json rather than
 * repeated on every datasheet that has it (Oath of Moment alone appears on 276).
 * Datasheets keep a {id, name, type} shell that resolves here by id.
 */
export interface ParsedFactionAbility {
    id: string;
    name: string;
    type: "Faction";
    legend: string;
    description: string;
}

/**
 * Pull the Faction ability definitions out of a raw datasheet.
 *
 * Core abilities are deliberately excluded — their rules live in
 * `app/library/unit-abilities`, which stays hand-authored and is never written
 * by the pipeline. Datasheet abilities are excluded too: they keep their own
 * description on the datasheet.
 *
 * Note the caller decides which faction these belong to, based on which
 * faction's datasheets they were found on. The source's `factionId` is wrong
 * here — Oath of Moment carries "WE" despite being Space Marine only.
 */
export function extractFactionAbilities(
    raw: RawAbility[],
): ParsedFactionAbility[] {
    return raw
        .filter((a) => a != null && !!a.id && a.type === "Faction")
        .map((a) => ({
            id: a.id,
            name: a.name,
            type: "Faction" as const,
            legend: a.legend ?? "",
            description: a.description,
        }));
}

/**
 * Extract trailing number parameter from ability name or description.
 * E.g. "Feel No Pain 5+" → 5
 */
function extractParameter(name: string): number | undefined {
    const match = name.match(/(\d+)\+?\s*$/);
    return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Wargear-conferred abilities — a storm shield, a resurrection orb, a jump pack.
 *
 * The source marks these `type: "Wargear"` inside the datasheet's abilities.
 * They belong on `wargear.abilities`, where `collectWargearMechanics` reads them
 * and where the loadout parser can resolve a reference to one: an option saying
 * "equipped with 1 storm shield" has nothing to point at otherwise.
 *
 * Left in the main abilities list they were labelled "Datasheet", which both
 * double-counted them in the mechanics coverage report and applied a
 * single-model item to the whole unit.
 *
 * `"Wargear profile"` is deliberately not included: "One Shot" annotates a
 * weapon rather than being a selectable item, so no loadout can name it.
 */
export function extractWargearAbilities(
    raw: RawAbility[],
    datasheetId: string,
): ParsedWargearAbility[] {
    return raw
        .filter((ability) => ability.type === "Wargear")
        .map((ability) => {
            const description = cleanDescription(ability.description) ?? "";
            const { mechanics } = extractDetachmentRuleMechanics(
                ability.name,
                ability.description,
                // A piece of wargear is worn by one model, so an unqualified
                // effect is the bearer's — the same default as an Enhancement.
                "bearer",
            );

            return {
                id: `${datasheetId}:${slugify(ability.name)}`,
                name: ability.name,
                description,
                mechanics,
                mechanicsSource: (mechanics.length > 0
                    ? "regex"
                    : "unparsed") as MechanicsSource,
            };
        });
}

export function transformAbilities(raw: RawAbility[]): ParsedAbility[] {
    return raw
        .filter((ability) => ability.type !== "Wargear")
        .map((ability) => {
        if (ability.type === "Core" || ability.type === "Faction") {
            const param = extractParameter(ability.name);
            const result: ParsedAbilityCore = {
                ...(ability.id ? { id: ability.id } : {}),
                name: ability.name,
                type: ability.type as "Core" | "Faction",
            };
            if (param !== undefined) {
                result.parameter = param;
            }
            return result;
        }

        // Datasheet ability — bespoke rules text, so derive mechanics from it.
        // Step 3 of the pipeline; step 4 (the skill) fills the remainder by
        // editing the emitted codex files directly.
        const { mechanics } = extractAbilityMechanics(
            ability.name,
            ability.description,
        );

        return {
            name: ability.name,
            legend: ability.legend ?? "",
            description: ability.description,
            type: "Datasheet" as const,
            parameter: ability.parameter === "" ? null : (ability.parameter ?? null),
            mechanics,
            mechanicsSource: (mechanics.length > 0
                ? "regex"
                : "unparsed") as MechanicsSource,
        };
    });
}
