import { CombatState } from "@/app/types/State";

/**
 * Unit strength from a current/starting pair.
 *
 * Which pair to pass depends on the unit:
 *  - multi-model  → models remaining vs starting models
 *  - single-model → wounds remaining vs its Wounds characteristic
 *
 * That split is the actual rule, and it is why `damaged` and `unitStrength` read
 * different fields: only one unit in the corpus (The Silent King) is both
 * multi-model and has a damaged profile.
 *
 * Half strength counts as below half — per `todo.md`, 11th edition triggers
 * Battle-shock *at* half strength as well as below it.
 *
 * Lives here rather than in the lab so the engine and any other consumer agree.
 */
export const deriveUnitStrength = ({
    current,
    starting,
}: {
    current: number;
    starting: number;
}): CombatState["unitStrength"] => {
    if (starting <= 0) return "full";
    if (current >= starting) return "full";
    if (current <= starting / 2) return "belowHalf";
    return "belowStarting";
};
