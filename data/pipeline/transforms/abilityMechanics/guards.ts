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
 * True when a description restricts its effect in a way the `Mechanic` type has
 * no field for, so extracting it would produce a rule that fires far too often.
 *
 * This matters most for characteristic modifiers. "On a Critical Wound, improve
 * the Armour Penetration characteristic of that attack by 1" yields a clean
 * `staticNumber`/`armourPenetration` mechanic — which, with the trigger dropped,
 * improves AP on *every* attack. The same goes for "until the end of the phase",
 * "once per battle" and aura ranges: nothing in the engine tracks any of them.
 *
 * Deliberately not applied to hit/wound roll modifiers, which have their own
 * narrower guard (`hasMultipleConditionalModifiers`) and a much longer history of
 * being consumed — widening the net there would drop existing coverage that this
 * change has no reason to touch.
 */
export function hasUnexpressedScope(text: string): boolean {
    const markers = [
        // Durations
        /until the (?:end|start) of (?:the|your|its|that)\b/i,
        // Usage limits
        /once per (?:turn|phase|battle|round|game)/i,
        /the first time\b/i,
        // Triggers on a specific roll result
        /on a critical (?:hit|wound)/i,
        /\bunmodified (?:hit|wound|save)? ?rolls? of\b/i,
        // Auras and any other proximity gate
        /within \d+"/i,
        // Effects limited to one *source* of damage. Nothing in the engine knows
        // whether an attack is psychic or a mortal wound, so "Feel No Pain 4+
        // against Psychic Attacks" extracted flat becomes blanket Feel No Pain.
        // Deliberately narrow: "against that unit" or "against an enemy unit"
        // restricts who is attacked, which phase and conditions already express.
        /against\s+(?:mortal wounds|psychic attacks)/i,
        /against\s+(?:ranged|melee)\s+attacks\b/i,
        // A target-selection or timing step before the effect applies
        /select one (?:enemy|friendly|of the following)/i,
        /after (?:this|that) (?:model|unit) has shot/i,
        /each time (?:this|that) (?:model|unit) is set up/i,
        /in your command phase/i,
    ];
    return markers.some((pattern) => pattern.test(text));
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
