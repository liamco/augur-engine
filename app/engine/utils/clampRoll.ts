/**
 * Clamp a modified hit or wound roll target to the valid range.
 * In 40k, an unmodified 1 always fails and an unmodified 6 always succeeds,
 * so the effective target range is 2+ to 6+.
 *
 * NOT for saving throws — see clampSaveRoll.
 */
export const clampRoll = (target: number): number => {
    return Math.max(2, Math.min(6, target));
};

/**
 * Clamp a modified saving throw.
 *
 * Saves have a floor but no ceiling: an unmodified 1 always fails, so 2+ is the
 * best achievable, but there is no "an unmodified 6 always succeeds" rule for
 * saves. A save worsened past 6+ (by AP, a penalty, or both) simply cannot be
 * made — capping it at 6+ would hand the model a save the rules do not allow.
 *
 * The out-of-range value is returned rather than collapsed to a flag so the
 * invulnerable-save comparison downstream still works on a single scale.
 */
export const clampSaveRoll = (target: number): number => {
    return Math.max(2, target);
};
