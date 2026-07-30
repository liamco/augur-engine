import type { Mechanic } from "@/app/types/Mechanic";
import { cleanDescription } from "./cleanDescription";
import { assertValidMechanics } from "./validate";
import type { Pattern } from "./patterns/types";
import { rollModifiers } from "./patterns/rollModifiers";
import { rerolls } from "./patterns/rerolls";
import {
    coreAbilityGrant,
    feelNoPainGrant,
    weaponAbilityGrant,
} from "./patterns/grants";
import { characteristics } from "./patterns/characteristics";
import { keywordGrant } from "./patterns/keywords";

/**
 * Regex extraction of mechanics from an ability's description.
 *
 * Ported from ../40k-game-buddy/scripts/regex-parsers/extract-mechanics-regex.js,
 * which is explicitly precision-first: only high-reliability patterns, with a
 * bail-out for anything ambiguous. That posture is essential here because
 * collectUnitMechanics feeds `ability.mechanics` straight into combat resolution
 * with no validation, so a wrong mechanic corrupts damage maths silently.
 *
 * Patterns run in order and each may contribute. Anything not confidently
 * matched leaves `mechanics: []`, which is the current behaviour — declining
 * cannot regress anything.
 */
const PATTERNS: Pattern[] = [
    weaponAbilityGrant,
    feelNoPainGrant,
    coreAbilityGrant,
    keywordGrant,
    rollModifiers,
    rerolls,
    characteristics,
];

export interface ExtractionResult {
    mechanics: Mechanic[];
    /** Names of the patterns that contributed, for per-pattern reporting. */
    matchedPatterns: string[];
}

export function extractAbilityMechanics(
    abilityName: string,
    description: string | null | undefined,
): ExtractionResult {
    const text = cleanDescription(description);
    if (!text) return { mechanics: [], matchedPatterns: [] };

    const mechanics: Mechanic[] = [];
    const matchedPatterns: string[] = [];

    for (const pattern of PATTERNS) {
        const result = pattern.extract(text, { abilityName });
        if (result && result.length > 0) {
            mechanics.push(...result);
            matchedPatterns.push(pattern.name);
        }
    }

    // Fail the parse rather than let an invalid mechanic reach the engine.
    assertValidMechanics(mechanics, `ability "${abilityName}"`);

    return { mechanics, matchedPatterns };
}

export { cleanDescription } from "./cleanDescription";
export { findMechanicProblems, MECHANIC_VOCABULARY } from "./validate";
