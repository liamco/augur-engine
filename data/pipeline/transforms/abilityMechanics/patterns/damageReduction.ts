import type { Mechanic } from "@/app/types/Mechanic";
import type { Pattern } from "./types";
import { hasUnexpressedScope } from "../guards";

/**
 * Damage reduction — Duty Eternal, Necrodermis, Armoured Resilience, Inner
 * Circle: "subtract 1 from the Damage characteristic of that attack".
 *
 * Defender-owned, but emitted as `thisUnit`: `damage` is attacker-owned in
 * targetResolver's ATTRIBUTE_SIDE map, and `resolveDamage` reads the `damage`
 * modifier once for the attack regardless of which side contributed it. The
 * mechanic lives on the unit being attacked, so `thisUnit` is what resolves it —
 * the same convention the damaged-profile extractor uses.
 *
 * A minimum-damage floor ("cannot be reduced below 1") is a separate effect
 * (`minDamage`) and is not matched here; conflating the two would cap damage
 * where the rule meant to protect it.
 */
export const damageReduction: Pattern = {
    name: "Damage Reduction",
    extract(text, { abilityName }) {
        // A reduction lasting only a phase, or triggered on a critical, applies
        // far too often once the qualifier is dropped.
        if (hasUnexpressedScope(text)) return null;

        const subtract = text.match(
            /subtract\s+(\d+)\s+from\s+the\s+damage\s+characteristic/i,
        );
        if (subtract) {
            const mechanic: Mechanic = {
                name: abilityName,
                entity: "thisUnit",
                effect: "rollPenalty",
                attribute: "damage",
                value: parseInt(subtract[1], 10),
            };
            return [mechanic];
        }

        if (/halve\s+the\s+damage\s+characteristic/i.test(text)) {
            const mechanic: Mechanic = {
                name: abilityName,
                entity: "thisUnit",
                effect: "halveDamage",
                attribute: "damage",
                value: true,
            };
            return [mechanic];
        }

        return null;
    },
};
