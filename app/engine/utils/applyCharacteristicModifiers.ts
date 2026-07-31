import { ResolvedEffectSet } from "@/app/types/ResolvedModifiers";

/**
 * Resolve a characteristic (Strength, Toughness, AP, invulnerable save) to the
 * value combat should actually use.
 *
 * Order matters: a `setsCharacteristic` replaces the datasheet value outright
 * ("the bearer has a Save characteristic of 2+"), and any `staticNumber` then
 * adjusts the result ("add 1 to the Toughness characteristic"). Doing it the
 * other way round would let a set silently discard a stacking bonus.
 *
 * Unlike roll modifiers, characteristic modifiers are not capped at ±1, which is
 * why this reads `staticNumber` — `effectResolver` sums those uncapped — rather
 * than `rollBonus`/`rollPenalty`.
 */
export const applyCharacteristicModifiers = (
    base: number,
    mods: ResolvedEffectSet | undefined,
): number => {
    if (!mods) return base;
    const set = mods.setsCharacteristic ?? base;
    return set + (mods.staticNumber ?? 0);
};
