import type { Mechanic } from "@/app/types/Mechanic";
import { resolveDirection, resolvePhase } from "../guards";
import type { Pattern } from "./types";

/**
 * Re-rolls: "re-roll a Hit roll of 1", "re-roll failed Wound rolls", "re-roll
 * Hit rolls".
 *
 * `value` records what may be re-rolled, matching how the lab renders it
 * (`reroll ${value}` in Octagon's formatSourceTag): 1 for rolls of 1, "failed"
 * for failed rolls, true for all.
 *
 * A re-roll always benefits the roller, so these are attacker-side only; a
 * description that reads as imposed is declined rather than guessed at.
 */
const SCOPES: { pattern: (word: string) => RegExp; value: number | string | boolean }[] = [
    {
        pattern: (w) => new RegExp(`re-?roll\\s+(?:a\\s+|all\\s+)?${w}\\s+rolls?\\s+of\\s+1`, "i"),
        value: 1,
    },
    {
        pattern: (w) => new RegExp(`re-?roll\\s+(?:all\\s+)?failed\\s+${w}\\s+rolls?`, "i"),
        value: "failed",
    },
    {
        pattern: (w) => new RegExp(`re-?roll\\s+(?:all\\s+)?${w}\\s+rolls?(?!\\s+of)`, "i"),
        value: true,
    },
];

export const rerolls: Pattern = {
    name: "Re-roll (Hit/Wound)",
    extract(text, { abilityName }) {
        // Re-rolls benefit whoever is rolling; only an attacker's own re-roll is
        // unambiguous from the text.
        if (resolveDirection(text) !== "own") return null;

        const phase = resolvePhase(text);
        const mechanics: Mechanic[] = [];

        for (const [attribute, word] of [
            ["hit", "hit"],
            ["wound", "wound"],
        ] as const) {
            for (const scope of SCOPES) {
                if (scope.pattern(word).test(text)) {
                    mechanics.push({
                        name: abilityName,
                        entity: "thisUnit",
                        effect: "reroll",
                        attribute,
                        value: scope.value,
                        ...(phase ? { phase } : {}),
                    });
                    break; // most specific scope wins
                }
            }
        }

        return mechanics.length > 0 ? mechanics : null;
    },
};
