import { CombatState } from "@/app/types/State";
import { MovementBehaviourDefinition } from "@/app/types/Behaviour";
import { getBehaviourAllows } from "../utils/behaviourRegistry";
import hold from "@/app/library/unit-behaviours/hold.json";
import move from "@/app/library/unit-behaviours/move.json";
import advance from "@/app/library/unit-behaviours/advance.json";
import fallBack from "@/app/library/unit-behaviours/fallBack.json";

export interface RestrictionResult {
    shoot: boolean;
    charge: boolean;
}

const movements = [hold, move, advance, fallBack] as MovementBehaviourDefinition[];

export const resolveRestrictions = (
    movementBehaviour: CombatState["movementBehaviour"],
    activeBehaviours: string[],
): RestrictionResult => {
    const result: RestrictionResult = { shoot: true, charge: true };

    if (!movementBehaviour) return result;

    const movement = movements.find((m) => m.name === movementBehaviour);
    if (!movement?.restricts) return result;

    for (const action of movement.restricts) {
        if (action === "shoot" || action === "charge") {
            result[action] = false;
        }
    }

    for (const behaviourName of activeBehaviours) {
        const allows = getBehaviourAllows(behaviourName);
        if (!allows) continue;
        if (!allows.includes(movementBehaviour)) continue;

        for (const allowed of allows) {
            if (
                (allowed === "shoot" || allowed === "charge") &&
                !result[allowed]
            ) {
                result[allowed] = true;
            }
        }
    }

    return result;
};
