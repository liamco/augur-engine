import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { extractAbilityMechanics } from "..";
import { findMechanicProblems } from "../validate";

/**
 * Runs the extractor over every real Datasheet ability description in the codex.
 *
 * Two jobs: prove nothing invalid can escape into the engine, and pin coverage so
 * a future edit can't silently stop extracting. The equivalent guard for weapon
 * attributes (weaponAttributeVocabulary.test.ts) is what would have caught the
 * silent zero-attribute bug, so the same shape is used here.
 */
const FACTIONS_DIR = join(process.cwd(), "app", "codex", "factions");

interface Ability {
    name: string;
    type?: string;
    description?: string;
}

function everyDatasheetAbility(): Ability[] {
    const out: Ability[] = [];
    for (const faction of readdirSync(FACTIONS_DIR, { withFileTypes: true })) {
        if (!faction.isDirectory()) continue;
        const dir = join(FACTIONS_DIR, faction.name, "datasheets");
        for (const file of readdirSync(dir)) {
            if (!file.endsWith(".json")) continue;
            const sheet = JSON.parse(readFileSync(join(dir, file), "utf-8"));
            for (const ability of sheet.abilities ?? []) {
                if (ability.type === "Datasheet") out.push(ability);
            }
        }
    }
    return out;
}

describe("ability mechanics extraction over the whole corpus", () => {
    const abilities = everyDatasheetAbility();
    const results = abilities.map((a) => ({
        ability: a,
        result: extractAbilityMechanics(a.name, a.description),
    }));
    const withMechanics = results.filter((r) => r.result.mechanics.length > 0);

    it("reads a non-trivial corpus", () => {
        expect(abilities.length).toBeGreaterThan(500);
    });

    it("emits only mechanics that validate against app/types/Mechanic.ts", () => {
        const problems = results.flatMap(({ ability, result }) =>
            result.mechanics.flatMap((m) =>
                findMechanicProblems(m, `${ability.name}`),
            ),
        );
        expect(problems).toEqual([]);
    });

    it("extracts from a meaningful share of abilities", () => {
        // A floor, not a target. If a change drops coverage below this, either the
        // change is wrong or the floor needs revisiting deliberately.
        expect(withMechanics.length).toBeGreaterThan(80);
    });

    it("never emits a roll modifier without a direction-bearing entity", () => {
        // hit/wound are attacker-owned; the wrong entity makes the mechanic inert
        // rather than loud, so assert the entity is one that can resolve to an
        // attacker.
        const bad = withMechanics.flatMap(({ ability, result }) =>
            result.mechanics
                .filter((m) => m.attribute === "hit" || m.attribute === "wound")
                .filter((m) => m.entity !== "thisUnit" && m.entity !== "opposingUnit")
                .map((m) => `${ability.name}: ${m.entity}/${m.attribute}`),
        );
        expect(bad).toEqual([]);
    });
});
