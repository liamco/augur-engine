import type { Mechanic } from "@/app/types/Mechanic";
import type { Pattern } from "./types";
import { hasUnexpressedScope } from "../guards";

/**
 * Characteristic modifiers and fixed values.
 *
 * These are direction-free: `invulnSave`, `save`, `toughness`,
 * `objectiveControl`, `wounds` and `leadership` are either defender-owned or not
 * direction-filtered at all in targetResolver's ATTRIBUTE_SIDE map, so
 * `thisUnit` is always correct. That is why they need no direction branch,
 * unlike the roll modifiers.
 *
 * Two effect choices matter here, because the resolvers now read these:
 *
 *  - **`setsCharacteristic`, not `staticNumber`, for "has a 4+ invulnerable
 *    save" and "has a Save characteristic of 2+".** These replace the datasheet
 *    value. Emitted as `staticNumber` they would *add* to it, turning a 4++ into
 *    a save 4 worse.
 *  - **`staticNumber`, not `rollBonus`, for additive characteristics.**
 *    `effectResolver` clamps `rollBonus` to 1 (the 40k roll-modifier cap), which
 *    does not apply to characteristics — "add 3 to the Strength characteristic"
 *    would silently become +1.
 */
export const characteristics: Pattern = {
    name: "Characteristic Modifier",
    extract(text, { abilityName }) {
        // Every attribute below is now read by a combat resolver, so a modifier
        // extracted without the scope its rules text specifies applies far too
        // often — "on a Critical Wound, improve AP by 1" would improve AP on
        // every attack. Decline rather than emit a rule that fires wrongly.
        if (hasUnexpressedScope(text)) return null;

        const mechanics: Mechanic[] = [];
        const push = (
            effect: Mechanic["effect"],
            attribute: Mechanic["attribute"],
            value: number,
            extra: Partial<Mechanic> = {},
        ) =>
            mechanics.push({
                name: abilityName,
                entity: "thisUnit",
                effect,
                attribute,
                value,
                ...extra,
            });

        // "has a 4+ invulnerable save" / "an invulnerable save of 4+"
        const invuln = text.match(
            /(\d)\+?\s*invulnerable\s+save|invulnerable\s+save\s+of\s+(\d)\+?/i,
        );
        if (invuln) {
            push(
                "setsCharacteristic",
                "invulnSave",
                parseInt(invuln[1] ?? invuln[2], 10),
            );
        }

        // "has a Save characteristic of 2+"
        const save = text.match(
            /has\s+a\s+save\s+characteristic\s+of\s+(\d)\+?/i,
        );
        if (save) push("setsCharacteristic", "save", parseInt(save[1], 10));

        // "add 1 to the Objective Control characteristic"
        const oc = text.match(
            /add\s+(\d+)\s+to\s+(?:the\s+)?(?:bearer'?s?\s+)?objective\s+control\s+characteristic/i,
        );
        if (oc) push("staticNumber", "objectiveControl", parseInt(oc[1], 10));

        // "add 1 to the bearer's Wounds characteristic"
        const wounds = text.match(
            /add\s+(\d+)\s+to\s+(?:the\s+)?(?:bearer'?s?\s+)?wounds\s+characteristic/i,
        );
        if (wounds) push("staticNumber", "wounds", parseInt(wounds[1], 10));

        // "add 1 to the Toughness characteristic"
        const toughness = text.match(
            /add\s+(\d+)\s+to\s+(?:the\s+)?(?:bearer'?s?\s+)?toughness\s+characteristic/i,
        );
        if (toughness) {
            push("staticNumber", "toughness", parseInt(toughness[1], 10));
        }

        // "add 3 to the Strength characteristic of the bearer's melee weapons"
        const strength = text.match(
            /add\s+(\d+)\s+to\s+(?:the\s+)?strength\s+characteristic/i,
        );
        if (strength) {
            push("staticNumber", "strength", parseInt(strength[1], 10));
        }

        // "improve the Armour Penetration characteristic ... by 1". AP is stored
        // negative but applied as a magnitude, so "improve by 1" adds 1.
        const ap = text.match(
            /improve\s+the\s+armour\s+penetration\s+characteristic[^.]*?by\s+(\d+)/i,
        );
        if (ap) push("staticNumber", "armourPenetration", parseInt(ap[1], 10));

        // "improve / worsen the Leadership characteristic ... by 1"
        const ldImprove = text.match(
            /improve\s+(?:the\s+)?leadership\s+characteristic[^.]*?by\s+(\d+)/i,
        );
        if (ldImprove) push("rollBonus", "leadership", parseInt(ldImprove[1], 10));

        const ldWorsen = text.match(
            /worsen\s+(?:the\s+)?leadership\s+characteristic[^.]*?by\s+(\d+)/i,
        );
        if (ldWorsen) push("rollPenalty", "leadership", parseInt(ldWorsen[1], 10));

        // "add 1 to the Attacks characteristic of melee weapons"
        const attacks = text.match(
            /add\s+(\d+)\s+to\s+(?:the\s+)?attacks\s+characteristic\s+of\s+[^.]*?melee\s+weapons/i,
        );
        if (attacks) {
            push("staticNumber", "attacks", parseInt(attacks[1], 10), {
                phase: ["fight"],
            });
        }

        return mechanics.length > 0 ? mechanics : null;
    },
};
