import type { Pattern } from "./types";

/**
 * Keyword grants: "has the GRENADES keyword", "the bearer can fly".
 *
 * Ported from the sibling project's Fly/Grenades/Smoke patterns, with two fixes
 * needed for augur's schema: it emitted `entity: "bearer"` / `"bearersUnit"`,
 * neither of which exists in augur's Entity union, and omitted the required
 * `value`. "Bearer" wording comes from wargear rules; on a datasheet ability the
 * unit-level entity is correct, and `thisModel`/`thisUnit` resolve identically in
 * entityResolver anyway.
 */
const KEYWORDS: { keyword: string; grant: RegExp; mention: RegExp }[] = [
    {
        keyword: "GRENADES",
        grant: /ha(?:s|ve)\s+(?:the\s+)?GRENADES\s+keyword/i,
        mention: /\bGRENADES\b/i,
    },
    {
        keyword: "SMOKE",
        grant: /ha(?:s|ve)\s+(?:the\s+)?SMOKE\s+keyword/i,
        mention: /\bSMOKE\b/i,
    },
    // "can fly" is the only phrasing that grants FLY; "has the FLY keyword" is
    // almost always a condition on the *target*, not a grant.
    { keyword: "FLY", grant: /\bcan\s+fly\b/i, mention: /\bcan\s+fly\b/i },
];

export const keywordGrant: Pattern = {
    name: "Keyword Grant",
    extract(text, { abilityName }) {
        const granted = KEYWORDS.filter((k) => k.grant.test(text));
        if (granted.length !== 1) return null;

        // A second keyword anywhere in the text means the grant regex has only
        // caught one of several — "has the SMOKE keyword and the GRENADES
        // keyword" matches SMOKE's grant form but not GRENADES'. Emitting one
        // would silently drop half the rule, so decline instead.
        const mentioned = KEYWORDS.filter((k) => k.mention.test(text));
        if (mentioned.length !== 1) return null;

        return [
            {
                name: abilityName,
                entity: "thisUnit",
                effect: "addsKeyword",
                keywords: [granted[0].keyword],
                value: true,
            },
        ];
    },
};
