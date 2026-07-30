import type { Mechanic } from "@/app/types/Mechanic";

/**
 * Runtime validation of extracted mechanics against app/types/Mechanic.ts.
 *
 * TypeScript can't check a value assembled from regex captures, and nothing
 * downstream validates — collectUnitMechanics feeds `ability.mechanics` straight
 * into combat resolution. So an invalid emission must fail the parse rather than
 * reach the engine. These sets are transcribed from the type unions; the
 * accompanying test asserts they stay in step.
 */

const EFFECTS = new Set([
    "addsAbility",
    "addsBehaviour",
    "addsKeyword",
    "addsWeaponAttribute",
    "autoSuccess",
    "blocksTargeting",
    "criticalWound",
    "extraSuccess",
    "forceRoll",
    "halveDamage",
    "ignoreBehaviour",
    "ignoreModifier",
    "ignoreState",
    "minDamage",
    "mortalWounds",
    "rollBonus",
    "rollPenalty",
    "reroll",
    "rollBlock",
    "setsFnp",
    "staticNumber",
]);

const ENTITIES = new Set([
    "diceRoll",
    "thisArmy",
    "thisUnit",
    "thisModel",
    "opposingArmy",
    "opposingUnit",
    "opposingModel",
    "ownArmy",
    "ownUnit",
    "ownModel",
    "targetArmy",
    "targetUnit",
    "targetModel",
]);

const ATTRIBUTES = new Set([
    // roll
    "hit",
    "wound",
    "save",
    // unit
    "movement",
    "toughness",
    "invulnSave",
    "wounds",
    "leadership",
    "objectiveControl",
    "feelNoPain",
    "detectionRange",
    // weapon
    "range",
    "attacks",
    "ballisticSkill",
    "weaponSkill",
    "strength",
    "armourPenetration",
    "damage",
    // context
    "distanceToTarget",
]);

const OPERATORS = new Set([
    "equals",
    "notEquals",
    "greaterThan",
    "greaterThanOrEqualTo",
    "lessThan",
    "lessThanOrEqualTo",
    "includes",
    "notIncludes",
    "includesAny",
    "ratioOf",
]);

const PHASES = new Set(["command", "movement", "shooting", "charge", "fight"]);

export const MECHANIC_VOCABULARY = {
    effects: EFFECTS,
    entities: ENTITIES,
    attributes: ATTRIBUTES,
    operators: OPERATORS,
} as const;

/** Returns a list of problems; empty means valid. */
export function findMechanicProblems(mechanic: Mechanic, context: string): string[] {
    const problems: string[] = [];
    const where = `${context}`;

    if (!mechanic.name) problems.push(`${where}: missing required "name"`);
    if (!ENTITIES.has(mechanic.entity))
        problems.push(`${where}: unknown entity "${mechanic.entity}"`);
    if (!EFFECTS.has(mechanic.effect))
        problems.push(`${where}: unknown effect "${mechanic.effect}"`);
    if (mechanic.attribute !== undefined && !ATTRIBUTES.has(mechanic.attribute))
        problems.push(`${where}: unknown attribute "${mechanic.attribute}"`);
    if (mechanic.value === undefined)
        problems.push(`${where}: missing required "value"`);

    for (const phase of mechanic.phase ?? []) {
        if (!PHASES.has(phase)) problems.push(`${where}: unknown phase "${phase}"`);
    }

    for (const condition of mechanic.conditions ?? []) {
        if (!ENTITIES.has(condition.entity))
            problems.push(`${where}: condition has unknown entity "${condition.entity}"`);
        if (!OPERATORS.has(condition.operator))
            problems.push(
                `${where}: condition has unknown operator "${condition.operator}"`,
            );
        if (condition.attribute !== undefined && !ATTRIBUTES.has(condition.attribute))
            problems.push(
                `${where}: condition has unknown attribute "${condition.attribute}"`,
            );
    }

    return problems;
}

/** Throws if any mechanic is invalid. Called before mechanics are written. */
export function assertValidMechanics(mechanics: Mechanic[], context: string): void {
    const problems = mechanics.flatMap((m) => findMechanicProblems(m, context));
    if (problems.length > 0) {
        throw new Error(
            `Invalid extracted mechanic(s):\n  ${problems.join("\n  ")}`,
        );
    }
}
