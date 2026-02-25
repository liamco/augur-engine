import { Attribute } from "@/app/types/Mechanic";
import { TaggedMechanic } from "../collectors/collectAllMechanics";

export interface IgnoreStateResult {
    mechanics: TaggedMechanic[];
    overrideSources: Map<Attribute, TaggedMechanic[]>;
}

export const resolveIgnoreStates = (
    mechanics: TaggedMechanic[],
): IgnoreStateResult => {
    const ignoreStateMechanics = mechanics.filter(
        (tm) => tm.mechanic.effect === "ignoreState",
    );

    if (ignoreStateMechanics.length === 0) {
        return { mechanics, overrideSources: new Map() };
    }

    // ignoreState attribute values are state identifiers (e.g. "benefitOfCover"),
    // not standard Attributes, so we compare as plain strings
    const ignoredStateKeys = new Set<string>(
        ignoreStateMechanics
            .map((tm) => tm.mechanic.attribute)
            .filter((a): a is Attribute => a !== undefined),
    );

    // Build a map: for each removed mechanic's attribute, record the
    // ignoreState mechanics that caused the removal (for UI source tags)
    const overrideSources = new Map<Attribute, TaggedMechanic[]>();
    for (const tm of mechanics) {
        if (tm.stateSource && ignoredStateKeys.has(tm.stateSource) && tm.mechanic.attribute) {
            const attr = tm.mechanic.attribute;
            if (!overrideSources.has(attr)) {
                overrideSources.set(attr, []);
            }
            overrideSources.get(attr)!.push(...ignoreStateMechanics);
        }
    }

    const filtered = mechanics.filter(
        (tm) =>
            tm.mechanic.effect !== "ignoreState" &&
            !(tm.stateSource && ignoredStateKeys.has(tm.stateSource)),
    );

    return { mechanics: filtered, overrideSources };
};
