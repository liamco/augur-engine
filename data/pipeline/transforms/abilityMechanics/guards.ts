/**
 * Precision guards. These decide when NOT to extract.
 *
 * The engine consumes `ability.mechanics` directly with no validation
 * (collectUnitMechanics.ts), so a mechanic that fires under the wrong conditions
 * silently corrupts combat maths. Refusing to extract leaves `mechanics: []`,
 * which is the status quo and harmless. Guards therefore err towards refusing.
 */

/**
 * True when a description carries several roll modifiers under *different*
 * conditions — e.g. "add 1 to the Hit roll. If the target is Battle-shocked, add
 * 1 to the Wound roll as well." Regex can find both modifiers but cannot tell
 * which condition governs which, so the whole description is deferred.
 *
 * Ported from the sibling project's `hasMultipleConditionalModifiers`.
 */
export function hasMultipleConditionalModifiers(text: string): boolean {
    const rollModifier =
        /(?:add|subtract)\s+\d+\s+(?:to|from)\s+(?:the\s+)?(?:hit|wound|save)\s+roll/gi;
    const modifiers = text.match(rollModifier) ?? [];
    if (modifiers.length <= 1) return false;

    const conditionals = [
        /if\s+(?:the\s+)?target\s+is/i,
        /if\s+(?:the\s+)?(?:enemy\s+)?unit\s+is/i,
        /if\s+this\s+(?:model|unit)\s+(?:charged|moved|remained)/i,
        /as\s+well/i,
        /in\s+addition/i,
    ];
    return conditionals.some((p) => p.test(text));
}

/**
 * Modifier direction.
 *
 * augur models these differently and the distinction is not cosmetic:
 *  - `own`     — this unit's own attacks are modified. Emitted as
 *                thisUnit/thisModel + `hit`/`wound`.
 *  - `imposed` — attacks *against* this unit are modified. Emitted as
 *                opposingUnit + `ballisticSkill`/`weaponSkill`, matching
 *                app/library/unit-abilities/stealth.json. Direction is enforced
 *                downstream by filterByTarget.
 *
 * Getting this backwards inverts who the modifier applies to, so anything
 * ambiguous returns `unknown` and the caller declines to extract.
 */
export type Direction = "own" | "imposed" | "unknown";

export function resolveDirection(text: string): Direction {
    // "each time an attack targets this unit", "each time a melee attack is
    // allocated to a model in this unit"
    const imposed =
        /attacks?\s+(?:that\s+)?targets?\s+th(?:is|at)\s+(?:unit|model)|attacks?\s+is\s+allocated\s+to\s+(?:a\s+model\s+in\s+)?th(?:is|at)\s+(?:unit|model)|targets?\s+th(?:is|at)\s+(?:unit|model)/i;
    // "each time a model in this unit makes an attack"
    const own = /makes?\s+(?:an?\s+|its\s+)?(?:ranged\s+|melee\s+|close\s+combat\s+)?attacks?/i;

    const isImposed = imposed.test(text);
    const isOwn = own.test(text);

    if (isImposed && !isOwn) return "imposed";
    if (isOwn && !isImposed) return "own";
    // Both present ("models in this unit make attacks that target this unit"
    // never happens, but "…makes an attack that targets this unit" does) — the
    // "makes" clause wins, since the subject of the sentence is the attacker.
    if (isOwn && isImposed) return "own";
    return "unknown";
}

/**
 * Phase implied by the wording, if any. `undefined` means unrestricted, which is
 * the safe default — over-restricting a phase silently disables a mechanic.
 */
export function resolvePhase(text: string): ("shooting" | "fight")[] | undefined {
    const melee = /melee\s+attack|close\s+combat|Fight\s+phase|fights?\b/i.test(text);
    const ranged = /ranged\s+attack|Shooting\s+phase|shoots?\b/i.test(text);
    if (melee && !ranged) return ["fight"];
    if (ranged && !melee) return ["shooting"];
    return undefined;
}
