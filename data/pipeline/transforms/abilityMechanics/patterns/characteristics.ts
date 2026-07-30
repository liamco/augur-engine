import type { Mechanic } from "@/app/types/Mechanic";
import type { Pattern } from "./types";

/**
 * Characteristic modifiers and fixed values.
 *
 * These are direction-free: `invulnSave`, `objectiveControl`, `wounds`,
 * `leadership` and `movement` are either defender-owned or not direction-filtered
 * at all in targetResolver's ATTRIBUTE_SIDE map, so `thisUnit` is always correct.
 * That is why they need no direction branch, unlike the roll modifiers.
 */
export const characteristics: Pattern = {
    name: "Characteristic Modifier",
    extract(text, { abilityName }) {
        const mechanics: Mechanic[] = [];
        const push = (
            effect: Mechanic["effect"],
            attribute: Mechanic["attribute"],
            value: number,
        ) => mechanics.push({ name: abilityName, entity: "thisUnit", effect, attribute, value });

        // "has a 4+ invulnerable save" / "an invulnerable save of 4+"
        const invuln = text.match(
            /(\d)\+?\s*invulnerable\s+save|invulnerable\s+save\s+of\s+(\d)\+?/i,
        );
        if (invuln) push("staticNumber", "invulnSave", parseInt(invuln[1] ?? invuln[2], 10));

        // "add 1 to the Objective Control characteristic"
        const oc = text.match(
            /add\s+(\d+)\s+to\s+(?:the\s+)?(?:bearer'?s?\s+)?objective\s+control\s+characteristic/i,
        );
        if (oc) push("rollBonus", "objectiveControl", parseInt(oc[1], 10));

        // "add 1 to the bearer's Wounds characteristic"
        const wounds = text.match(
            /add\s+(\d+)\s+to\s+(?:the\s+)?(?:bearer'?s?\s+)?wounds\s+characteristic/i,
        );
        if (wounds) push("rollBonus", "wounds", parseInt(wounds[1], 10));

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
            mechanics.push({
                name: abilityName,
                entity: "thisUnit",
                effect: "rollBonus",
                attribute: "attacks",
                value: parseInt(attacks[1], 10),
                phase: ["fight"],
            });
        }

        return mechanics.length > 0 ? mechanics : null;
    },
};
