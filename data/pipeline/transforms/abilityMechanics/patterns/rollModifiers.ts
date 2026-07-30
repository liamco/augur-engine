import type { Mechanic } from "@/app/types/Mechanic";
import {
    hasMultipleConditionalModifiers,
    resolveDirection,
    resolvePhase,
} from "../guards";
import type { Pattern } from "./types";

/**
 * Hit and Wound roll modifiers: "add 1 to the Hit roll", "subtract 1 from the
 * Wound roll".
 *
 * Direction is carried by `entity`, not by swapping the attribute. `hit` and
 * `wound` are attacker-owned in targetResolver's ATTRIBUTE_SIDE map, so:
 *  - own      → `thisUnit`, which resolves to the attacker from the attacker's
 *               own perspective
 *  - imposed  → `opposingUnit`, which resolves to the attacker from the
 *               defender's perspective
 * Emitting `thisUnit` for an imposed modifier would resolve to the defender,
 * filterByTarget would drop it, and the rule would silently do nothing.
 *
 * `ballisticSkill`/`weaponSkill` are deliberately NOT used here: those modify the
 * characteristic rather than the roll, and are reserved for rules that genuinely
 * say so (Benefit of Cover, Stealth). "Subtract 1 from the Hit roll" translates
 * literally to a `hit` modifier.
 */
export const rollModifiers: Pattern = {
    name: "Roll Modifier (Hit/Wound)",
    extract(text, { abilityName }) {
        if (hasMultipleConditionalModifiers(text)) return null;

        const direction = resolveDirection(text);
        if (direction === "unknown") return null;

        const entity = direction === "own" ? "thisUnit" : "opposingUnit";
        const phase = resolvePhase(text);
        const mechanics: Mechanic[] = [];

        const rolls = [
            { attribute: "hit" as const, word: "hit" },
            { attribute: "wound" as const, word: "wound" },
        ];

        for (const { attribute, word } of rolls) {
            const bonus = text.match(
                new RegExp(`add\\s+(\\d+)\\s+to\\s+(?:the\\s+)?${word}\\s+roll`, "i"),
            );
            if (bonus) {
                mechanics.push({
                    name: abilityName,
                    entity,
                    effect: "rollBonus",
                    attribute,
                    value: parseInt(bonus[1], 10),
                    ...(phase ? { phase } : {}),
                });
            }

            const penalty = text.match(
                new RegExp(
                    `subtract\\s+(\\d+)\\s+from\\s+(?:the\\s+)?${word}\\s+roll`,
                    "i",
                ),
            );
            if (penalty) {
                mechanics.push({
                    name: abilityName,
                    entity,
                    effect: "rollPenalty",
                    attribute,
                    value: parseInt(penalty[1], 10),
                    ...(phase ? { phase } : {}),
                });
            }
        }

        return mechanics.length > 0 ? mechanics : null;
    },
};
