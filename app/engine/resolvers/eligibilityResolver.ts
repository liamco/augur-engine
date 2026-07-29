import { CombatContext } from "@/app/types/CombatContext";
import { TargetEligibility } from "@/app/types/CombatResult";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { TaggedMechanic } from "../collectors/collectAllMechanics";
import { resolveEntity } from "./entityResolver";

const DEFAULT_DETECTION_RANGE = 15;

/**
 * Targeting eligibility. A `blocksTargeting` mechanic means "the owner cannot be
 * targeted beyond its detection range (default 15in, modifiable)". If any such
 * mechanic is active and the attacker is beyond that range, the target is
 * ineligible. A blank/unknown range is permissive (eligible).
 */
export const resolveTargetEligibility = (
    mechanics: TaggedMechanic[],
    context: CombatContext,
    modifiers: ResolvedModifiers,
): TargetEligibility => {
    const range = context.rangeToTarget;
    if (range == null) return { eligible: true, reason: null };

    for (const { mechanic, perspective } of mechanics) {
        if (mechanic.effect !== "blocksTargeting") continue;

        const owner = resolveEntity(mechanic.entity, context, perspective).unit;
        const base = Number(
            owner.models[0]?.detectionRange ?? DEFAULT_DETECTION_RANGE,
        );

        const mods = modifiers.get("detectionRange");
        const detection =
            mods?.staticNumber != null
                ? mods.staticNumber
                : base + (mods?.rollBonus ?? 0) - (mods?.rollPenalty ?? 0);

        if (range > detection) {
            return { eligible: false, reason: mechanic.name };
        }
    }

    return { eligible: true, reason: null };
};
