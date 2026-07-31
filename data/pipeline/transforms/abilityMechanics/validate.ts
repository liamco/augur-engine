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
    "setsCharacteristic",
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

/**
 * Attributes a combat-phase resolver actually reads out of `resolved`.
 *
 * Being in `ATTRIBUTES` only means a mechanic is *well-formed*. Being in here
 * means it will *do something*. The rest (`wounds`, `movement`, `leadership`,
 * `objectiveControl`, `range`, `distanceToTarget`) are valid to write but no
 * resolver consults them, so a mechanic targeting one is inert — it looks like
 * coverage and changes nothing.
 *
 * Kept in step with the resolvers by hand; the accompanying test pins the list
 * so a resolver gaining or losing a lookup is a visible change.
 */
export const ENGINE_CONSUMED_ATTRIBUTES: ReadonlySet<string> = new Set([
    // resolveHitRoll
    "hit",
    "ballisticSkill",
    "weaponSkill",
    // resolveWoundRoll
    "wound",
    "strength",
    "toughness",
    // resolveSaveRoll
    "save",
    "armourPenetration",
    "invulnSave",
    // resolveAttackCount / resolveDamage / resolveFeelNoPain
    "attacks",
    "damage",
    "feelNoPain",
    // resolveTargetEligibility
    "detectionRange",
]);

/**
 * The distinct attributes in `mechanics` that no resolver reads, sorted.
 *
 * Reported rather than thrown: some inert emissions are correct data waiting on
 * the engine (the damaged-profile Objective Control penalty, for instance), so
 * failing the parse would mean deleting right answers. Surfacing the count keeps
 * the gap visible instead.
 */
export function findInertAttributes(mechanics: Mechanic[]): string[] {
    const inert = new Set<string>();
    for (const mechanic of mechanics) {
        const attr = mechanic.attribute;
        if (attr && !ENGINE_CONSUMED_ATTRIBUTES.has(attr)) inert.add(attr);
    }
    return [...inert].sort();
}

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
