/**
 * Clamp a modified roll target to the valid range.
 * In 40k, an unmodified 1 always fails and an unmodified 6 always succeeds,
 * so the effective target range is 2+ to 6+.
 */
export const clampRoll = (target: number): number => {
    return Math.max(2, Math.min(6, target));
};
