import type { Condition, Mechanic } from "@/app/types/Mechanic";

/**
 * Who an extracted rule actually affects.
 *
 * Enhancements are given to a single CHARACTER model — the *bearer* — but the
 * engine has no model-level scoping: `entityResolver` resolves `thisModel` and
 * `thisUnit` through the same branch, so a mechanic emitted for the bearer
 * applies to every model in its unit.
 *
 * Rather than over-apply, a bearer-scoped mechanic is gated on the unit being a
 * single model, where bearer and unit are the same thing. Most CHARACTER
 * datasheets are single-model, so this is correct for the common case and
 * correctly *inactive* when the character is leading a bodyguard unit — it
 * under-applies rather than buffing four models that never had the Enhancement.
 */
export type Scope = "unit" | "bearer" | "split";

/**
 * Gates a mechanic on the unit being one model.
 *
 * `startingModelCount` rather than `modelCount`: a five-model squad reduced to
 * one survivor must not suddenly acquire a bearer-only buff.
 */
export const SINGLE_MODEL_CONDITION: Condition = {
    entity: "thisUnit",
    state: "startingModelCount",
    operator: "equals",
    value: 1,
};

/**
 * Phrases that put the effect on the bearer's *unit*.
 *
 * "while the bearer is leading a unit" deliberately isn't here — it only
 * establishes which unit is affected, and the effect itself is described by a
 * following "models in that unit…" clause.
 */
const UNIT_EFFECT =
    /models?\s+in\s+(?:the\s+bearer'?s?|that)\s+unit|(?:the\s+)?bearer'?s?\s+unit\b|that\s+unit\s+(?:have|has|gains?)|equipped\s+by\s+models\s+in/i;

/** Phrases that put the effect on the bearer model alone. */
const BEARER_EFFECT =
    /\b(?:the\s+)?bearer\s+(?:has|have|gains?|regains?|counts?\s+as|is\s+eligible|can\s+)|characteristics?\s+of\s+(?:the\s+)?bearer|(?:the\s+)?bearer'?s\s+(?:melee|ranged)?\s*weapons?|equipped\s+by\s+the\s+bearer|this\s+model\s+has\s+a/i;

/**
 * Classify a description's scope.
 *
 * `fallback` is what to assume when the text names neither — an Enhancement's
 * implicit subject is its bearer, a detachment rule's is a unit from your army,
 * so only the caller knows which.
 */
export function classifyScope(text: string, fallback: Scope): Scope {
    const unit = UNIT_EFFECT.test(text);
    const bearer = BEARER_EFFECT.test(text);

    // One description doing both means the mechanics belong to different
    // scopes, and nothing here can tell which mechanic came from which clause.
    if (unit && bearer) return "split";
    if (unit) return "unit";
    if (bearer) return "bearer";
    return fallback;
}

/**
 * Apply a scope to extracted mechanics, or decline them.
 *
 * Returns `null` for a split scope: emitting the mechanics under either scope
 * would be wrong for half of them, and the skill can read the description.
 */
export function applyScope(
    mechanics: Mechanic[],
    scope: Scope,
): Mechanic[] | null {
    if (scope === "split") return null;
    if (scope === "unit") return mechanics;

    return mechanics.map((mechanic) => ({
        ...mechanic,
        conditions: [...(mechanic.conditions ?? []), SINGLE_MODEL_CONDITION],
    }));
}
