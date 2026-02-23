import { Condition } from "@/app/types/Mechanic";
import { EngagementPhase } from "@/app/types/Engagement";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "../collectors/collectAllMechanics";
import { resolveEntity, EntityData } from "./entityResolver";
import { evaluateOperator } from "./operatorEvaluator";
import { resolveState } from "./stateResolver";

export const filterByPhase = (
    mechanics: TaggedMechanic[],
    phase: EngagementPhase,
): TaggedMechanic[] =>
    mechanics.filter(
        (tm) => !tm.mechanic.phase || tm.mechanic.phase.includes(phase),
    );

export const filterByConditions = (
    mechanics: TaggedMechanic[],
    context: CombatContext,
): TaggedMechanic[] => {
    return mechanics
        .filter(({ mechanic, perspective }) => {
            if (!mechanic.conditions || mechanic.conditions.length === 0) {
                return true;
            }
            return mechanic.conditions.every((condition) =>
                evaluateCondition(condition, context, perspective),
            );
        })
        .map((tagged) => applyRatioMultiplier(tagged, context));
};

const evaluateCondition = (
    condition: Condition,
    context: CombatContext,
    perspective: "attacker" | "defender",
): boolean => {
    const entityData = resolveEntity(condition.entity, context, perspective);
    const actualValue = extractConditionValue(condition, entityData, context);
    return evaluateOperator(condition.operator, actualValue, condition.value);
};

const applyRatioMultiplier = (
    tagged: TaggedMechanic,
    context: CombatContext,
): TaggedMechanic => {
    const { mechanic, perspective } = tagged;
    if (!mechanic.conditions) return tagged;

    const ratioCondition = mechanic.conditions.find(
        (c) => c.operator === "ratioOf",
    );
    if (!ratioCondition) return tagged;

    const entityData = resolveEntity(
        ratioCondition.entity,
        context,
        perspective,
    );
    const actual = extractConditionValue(ratioCondition, entityData, context);
    const expected = ratioCondition.value;

    if (typeof actual !== "number" || typeof expected !== "number") {
        return tagged;
    }

    const ratio = Math.floor(actual / expected);
    const originalValue = Number(mechanic.value);

    return {
        ...tagged,
        mechanic: {
            ...mechanic,
            value: originalValue * ratio,
        },
    };
};

const extractConditionValue = (
    condition: Condition,
    entityData: EntityData,
    context: CombatContext,
): boolean | number | string | string[] | undefined => {
    if (condition.state) {
        return resolveState(condition.state, entityData.combatState);
    }

    if (condition.attribute) {
        return resolveAttribute(condition.attribute, entityData, context);
    }

    if (condition.keywords) {
        return entityData.unit.keywords?.map((k) => k.keyword) ?? [];
    }

    if (condition.abilities) {
        return entityData.unit.abilities?.map((a) => a.name) ?? [];
    }

    return undefined;
};

const resolveAttribute = (
    attr: string,
    entityData: EntityData,
    _context: CombatContext,
): number | string | undefined => {
    const weaponMap: Record<string, string> = {
        range: "range",
        attacks: "a",
        skill: "bsWs",
        strength: "s",
        armourPenetration: "ap",
        damage: "d",
    };

    if (attr in weaponMap && entityData.weaponProfile) {
        const key = weaponMap[attr] as keyof typeof entityData.weaponProfile;
        const val = entityData.weaponProfile[key];
        return val as number | string;
    }

    const unitMap: Record<string, string> = {
        movement: "m",
        toughness: "t",
        save: "sv",
        invulnSave: "invSv",
        wounds: "w",
        leadership: "ld",
        objectiveControl: "oc",
    };

    if (attr in unitMap && entityData.unit.models.length > 0) {
        const key = unitMap[attr] as keyof (typeof entityData.unit.models)[0];
        const val = entityData.unit.models[0][key];
        return val as number | string;
    }

    return undefined;
};
