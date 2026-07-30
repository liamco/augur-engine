import type { Mechanic } from "@/app/types/Mechanic";
import { cleanDescription } from "./cleanDescription";
import { assertValidMechanics } from "./validate";

/**
 * Mechanics for a datasheet's damaged profile.
 *
 * Ported from `parseDamagedMechanics` in
 * ../40k-game-buddy/scripts/regex-parsers/parse-datasheet-fields.js — a different
 * script from the ability extractor, which is why it was missed on the first pass.
 *
 * High yield for very little surface: 94 datasheets carry a damaged profile but
 * only 15 distinct descriptions exist between them, and effectively two patterns
 * cover them all.
 *
 * The "While this model has 1-4 wounds remaining" clause is deliberately NOT
 * encoded as a condition. `damaged.threshold` holds the number and
 * collectDamagedMechanics only collects while `combatState.isDamaged` is true, so
 * a condition here would gate the mechanic twice.
 *
 * Schema notes vs the original: it emitted `statPenalty`/`statBonus`/
 * `statMultiplier` with abbreviated attributes (`h`, `oc`, `a`), none of which
 * exist in augur. Characteristic penalties map onto `rollPenalty`, matching how
 * characteristics.ts already handles Objective Control and Leadership.
 */

/** Clauses the Mechanic type cannot express — presence means decline. */
const UNEXPRESSIBLE = [
    // "halve the Attacks characteristic" needs a multiplier effect, which the
    // Effect union has no member for.
    /halve[sd]?\s+the\s+Attacks/i,
];

export function extractDamagedMechanics(
    description: string | null | undefined,
): Mechanic[] | null {
    const text = cleanDescription(description);
    if (!text) return null;

    if (UNEXPRESSIBLE.some((p) => p.test(text))) return null;

    const mechanics: Mechanic[] = [];

    // "each time this model makes an attack, subtract 1 from the Hit roll" —
    // present in every damaged description in the corpus.
    const hit = text.match(/subtract\s+(\d+)\s+from\s+(?:the\s+)?Hit\s+roll/i);
    if (hit) {
        mechanics.push({
            name: "Damaged",
            entity: "thisUnit",
            effect: "rollPenalty",
            attribute: "hit",
            value: parseInt(hit[1], 10),
        });
    }

    // "subtract 4 from this model's / its Objective Control characteristic"
    const oc = text.match(
        /subtract\s+(\d+)\s+from\s+(?:this\s+model'?s?|its)\s+Objective\s+Control\s+characteristic/i,
    );
    if (oc) {
        mechanics.push({
            name: "Damaged",
            entity: "thisUnit",
            effect: "rollPenalty",
            attribute: "objectiveControl",
            value: parseInt(oc[1], 10),
        });
    }

    if (mechanics.length === 0) return null;

    assertValidMechanics(mechanics, "damaged profile");
    return mechanics;
}
