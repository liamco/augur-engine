import { BehaviourOverride } from "@/app/types/Behaviour";

import advanceAndShoot from "@/app/library/unit-tactics/advance-and-shoot.json";
import advanceAndCharge from "@/app/library/unit-tactics/advance-and-charge.json";
import fallBackAndShoot from "@/app/library/unit-tactics/fall-back-and-shoot.json";
import fallBackAndCharge from "@/app/library/unit-tactics/fall-back-and-charge.json";

const behaviourFiles: BehaviourOverride[] = [
    advanceAndShoot as BehaviourOverride,
    advanceAndCharge as BehaviourOverride,
    fallBackAndShoot as BehaviourOverride,
    fallBackAndCharge as BehaviourOverride,
];

const allowsRegistry = new Map<string, string[]>();

for (const behaviour of behaviourFiles) {
    if (!behaviour.allows || !behaviour.abilities) continue;
    for (const ability of behaviour.abilities) {
        allowsRegistry.set(ability, behaviour.allows);
    }
}

export const getBehaviourAllows = (
    abilityName: string,
): string[] | undefined => {
    return allowsRegistry.get(abilityName);
};
