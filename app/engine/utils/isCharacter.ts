import { TestUnit } from "@/app/types/Test";

/**
 * Whether a unit is a CHARACTER.
 *
 * Matched case-insensitively because the codex stores keywords title-cased
 * ("Character") while the rules — and anything hand-authored against them —
 * write them in caps.
 *
 * Note this asks about the datasheet, not the current engagement: a bodyguard
 * unit led by a character is not itself a character, so a caller that cares
 * about an attached leader has to check the leader too.
 */
export const isCharacter = (unit: Pick<TestUnit, "keywords">): boolean =>
    unit.keywords.some(
        (entry) => entry.keyword.trim().toUpperCase() === "CHARACTER",
    );
