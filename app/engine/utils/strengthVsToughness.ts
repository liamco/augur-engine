/**
 * Determine the wound roll target based on the 40k S vs T table.
 * Returns the value needed on a D6 to wound.
 */
export const strengthVsToughness = (
    strength: number,
    toughness: number,
): number => {
    if (strength >= toughness * 2) return 2;
    if (strength > toughness) return 3;
    if (strength === toughness) return 4;
    if (strength * 2 <= toughness) return 6;
    return 5;
};
