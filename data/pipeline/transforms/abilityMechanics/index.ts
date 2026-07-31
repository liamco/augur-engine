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
import { damageReduction } from "./patterns/damageReduction";
import { applyScope, classifyScope, type Scope } from "./bearerScope";

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
    damageReduction,
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

    const { mechanics, matchedPatterns } = runPatterns(text, abilityName);

    // Fail the parse rather than let an invalid mechanic reach the engine.
    assertValidMechanics(mechanics, `ability "${abilityName}"`);

    return { mechanics, matchedPatterns };
}

/**
 * A detachment's own rules: its abilities and its Enhancements.
 *
 * Same patterns as a datasheet ability, with two differences that come from
 * where the text lives:
 *
 *  - the leading "`<KEYWORD> model only.`" restriction is dropped, since the
 *    detachment file already carries it as `eligibleDatasheets`;
 *  - the result is scope-checked, because an Enhancement is worn by one model
 *    while a detachment rule applies to whole units. See bearerScope.
 *
 * `scopeFallback` is what to assume when the text names no scope: `"bearer"` for
 * an Enhancement, `"unit"` for a detachment ability.
 */
export function extractDetachmentRuleMechanics(
    ruleName: string,
    description: string | null | undefined,
    scopeFallback: Scope,
): ExtractionResult {
    const cleaned = cleanDescription(description);
    if (!cleaned) return { mechanics: [], matchedPatterns: [] };

    const text = stripEligibilityPrefix(cleaned);
    const { mechanics, matchedPatterns } = runPatterns(text, ruleName);
    if (mechanics.length === 0) return { mechanics: [], matchedPatterns: [] };

    const scoped = applyScope(mechanics, classifyScope(text, scopeFallback));
    // A split scope declines everything: the patterns cannot say which clause
    // each mechanic came from, so neither scope is safe to apply wholesale.
    if (!scoped) return { mechanics: [], matchedPatterns: [] };

    assertValidMechanics(scoped, `detachment rule "${ruleName}"`);

    return { mechanics: scoped, matchedPatterns };
}

/**
 * Drop a leading eligibility restriction — "NECRONS model only.",
 * "C'tan Shard of the Deceiver model only.", "CRYPTEK units only."
 *
 * Anchored to the start so a mid-sentence "a NECRONS model only when charging"
 * is left alone.
 */
export function stripEligibilityPrefix(text: string): string {
    return text
        .replace(/^[A-Za-z'’\- ]+?\s+(?:model|unit)s?\s+only\.\s*/i, "")
        .trim();
}

const runPatterns = (text: string, abilityName: string): ExtractionResult => {
    const mechanics: Mechanic[] = [];
    const matchedPatterns: string[] = [];

    for (const pattern of PATTERNS) {
        const result = pattern.extract(text, { abilityName });
        if (result && result.length > 0) {
            mechanics.push(...result);
            matchedPatterns.push(pattern.name);
        }
    }

    return { mechanics, matchedPatterns };
};

export { cleanDescription } from "./cleanDescription";
export {
    ENGINE_CONSUMED_ATTRIBUTES,
    findInertAttributes,
    findMechanicProblems,
    MECHANIC_VOCABULARY,
} from "./validate";
export { classifyScope, SINGLE_MODEL_CONDITION, type Scope } from "./bearerScope";
