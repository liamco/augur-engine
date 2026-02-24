import { CombatContext } from "@/app/types/CombatContext";
import { CombatResult } from "@/app/types/CombatResult";
import { collectAllMechanics } from "../collectors/collectAllMechanics";
import { expandAbilityMechanics } from "../collectors/expandAbilityMechanics";
import { filterByConditions, filterByPhase } from "../resolvers/conditionResolver";
import { resolveEffects } from "../resolvers/effectResolver";
import { resolveAttackCount } from "../combat-phases/resolveAttackCount";
import { resolveHitRoll } from "../combat-phases/resolveHitRoll";
import { resolveWoundRoll } from "../combat-phases/resolveWoundRoll";
import { resolveSaveRoll } from "../combat-phases/resolveSaveRoll";
import { resolveDamage } from "../combat-phases/resolveDamage";
import { resolveFeelNoPain } from "../combat-phases/resolveFeelNoPain";

export const runCombat = (context: CombatContext): CombatResult => {
    // Stage 1: Collect all mechanics from every hierarchy layer
    const allMechanics = collectAllMechanics(context);

    // Stage 1.5: Expand addsAbility mechanics into their library definitions
    const expandedMechanics = expandAbilityMechanics(allMechanics, context);

    // Stage 1.5: Filter by engagement phase
    const currentPhase = context.engagementPhase
        ?? (context.weaponProfile.type === "Ranged" ? "shooting" : "fight");
    const phaseMechanics = filterByPhase(expandedMechanics, currentPhase);

    // Stage 2: Evaluate conditions — filter to only active mechanics
    const activeMechanics = filterByConditions(phaseMechanics, context);

    // Stage 3: Resolve effects — group by attribute, apply precedence
    const resolved = resolveEffects(activeMechanics);

    // Stage 4: Execute combat phases sequentially
    const attackCount = resolveAttackCount(context, resolved);
    const hitPhase = resolveHitRoll(context, resolved);
    const woundPhase = resolveWoundRoll(context, resolved);
    const savePhase = resolveSaveRoll(context, resolved);
    const damagePhase = resolveDamage(context, resolved);
    const feelNoPain = resolveFeelNoPain(context, resolved);

    return {
        attackCount,
        hitPhase,
        woundPhase,
        savePhase,
        damagePhase,
        feelNoPain,
    };
};
