import { Mechanic } from "@/app/types/Mechanic";
import stealth from "./stealth.json";
import feelNoPain from "./feel-no-pain.json";

/**
 * Active unit-ability allowlist (keyed by sanitised ability name). To activate
 * a finished ability, add ONE import above and ONE line here.
 * (deadly-demise, fights-first, fly, hover, infiltrators, leader, scouts,
 * lone-operative are intentionally omitted — unfinished stubs.)
 */
export const unitAbilityRegistry: Record<string, Mechanic> = {
    stealth: stealth as unknown as Mechanic,
    // keyed by sanitised ability name — sanitize("FEEL NO PAIN") === "feelnopain"
    feelnopain: feelNoPain as unknown as Mechanic,
};
