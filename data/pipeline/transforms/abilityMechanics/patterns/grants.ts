import type { Condition, Mechanic } from "@/app/types/Mechanic";
import type { Pattern } from "./types";

/**
 * Grants of existing rules — the largest cleanly-parseable group in the corpus
 * (48 descriptions grant a bracketed weapon ability, 26 grant Feel No Pain).
 *
 * These are the safest extractions available: the granted rule's own mechanics
 * already live in app/library, so the emitted mechanic only has to name it. The
 * engine's expandAbilityMechanics/expandWeaponAttributeMechanics resolve the name
 * against the library registry at combat time.
 */

/**
 * "While this model is leading a unit, …" — the grant only applies while the
 * character is attached. Missed, the bonus would apply permanently.
 */
function leadingCondition(text: string): Condition[] | undefined {
    if (!/while this model is leading a unit/i.test(text)) return undefined;
    return [
        {
            entity: "thisUnit",
            state: "isLeadingUnit",
            operator: "equals",
            value: true,
        },
    ];
}

/** Bracketed weapon abilities: "[SUSTAINED HITS 1]", "[LETHAL HITS]". */
export const weaponAbilityGrant: Pattern = {
    name: "Weapon Ability Grant",
    extract(text, { abilityName }) {
        const all = [...text.matchAll(/\[([A-Z][A-Z0-9\s\-']*?)\]/g)];
        if (all.length !== 1) return null; // 0 = no grant; >1 = ambiguous conditions

        const raw = all[0][1].trim();
        // Trailing parameter, e.g. "SUSTAINED HITS 1" -> ("SUSTAINED HITS", 1)
        const parameterised = raw.match(/^(.*?)\s+(\d+)$/);
        const attribute = parameterised ? parameterised[1] : raw;
        const value: number | boolean = parameterised
            ? parseInt(parameterised[2], 10)
            : true;

        const conditions = leadingCondition(text);
        const mechanic: Mechanic = {
            name: abilityName,
            entity: "thisUnit",
            effect: "addsWeaponAttribute",
            weaponAttributes: [attribute],
            value,
            ...(conditions ? { conditions } : {}),
        };
        return [mechanic];
    },
};

/** "have the Feel No Pain 5+ ability" — needs the threshold to be meaningful. */
export const feelNoPainGrant: Pattern = {
    name: "Feel No Pain Grant",
    extract(text, { abilityName }) {
        const match = text.match(/Feel\s+No\s+Pain\s+(\d)\+/i);
        if (!match) return null;

        const conditions = leadingCondition(text);
        return [
            {
                name: abilityName,
                entity: "thisUnit",
                effect: "setsFnp",
                attribute: "feelNoPain",
                value: parseInt(match[1], 10),
                ...(conditions ? { conditions } : {}),
            },
        ];
    },
};

/**
 * Named core abilities. Restricted to a known list: an open-ended "has the X
 * ability" match would invent ability names the library can't resolve, producing
 * a mechanic that looks populated but does nothing.
 */
const CORE_ABILITIES: { pattern: RegExp; name: string; parameterised?: boolean }[] = [
    { pattern: /\bScouts\s+(\d+)"/i, name: "SCOUTS", parameterised: true },
    { pattern: /\bStealth\b/i, name: "STEALTH" },
    { pattern: /\bInfiltrators\b/i, name: "INFILTRATORS" },
    { pattern: /\bLone\s+Operative\b/i, name: "LONE OPERATIVE" },
    { pattern: /\bDeep\s+Strike\b/i, name: "DEEP STRIKE" },
    { pattern: /\bFights?\s+First\b/i, name: "FIGHTS FIRST" },
    { pattern: /\bIgnores\s+Cover\b/i, name: "IGNORES COVER" },
];

export const coreAbilityGrant: Pattern = {
    name: "Core Ability Grant",
    extract(text, { abilityName }) {
        if (!/ha(?:s|ve)\s+(?:the\s+)?/i.test(text)) return null;

        const matched = CORE_ABILITIES.map((entry) => ({
            entry,
            match: text.match(entry.pattern),
        })).filter((x) => x.match);

        if (matched.length !== 1) return null; // 0 = none; >1 = ambiguous

        const { entry, match } = matched[0];
        const value: number | boolean =
            entry.parameterised && match?.[1] ? parseInt(match[1], 10) : true;

        const conditions = leadingCondition(text);
        return [
            {
                name: abilityName,
                entity: "thisUnit",
                effect: "addsAbility",
                abilities: [entry.name],
                value,
                ...(conditions ? { conditions } : {}),
            },
        ];
    },
};
