import { Mechanic, Condition } from "@/app/types/Mechanic";
import { ParsedAttribute } from "./parseParameterisedName";

const CRITICAL_THRESHOLD = 6;

type PlaceholderValue = string | number | boolean;

interface HydrateOptions {
    halfRange?: number;
}

const isPlaceholder = (value: unknown): value is string =>
    typeof value === "string" && value.startsWith("$");

const resolveValue = (
    value: PlaceholderValue,
    parsed: ParsedAttribute,
    options: HydrateOptions,
): PlaceholderValue => {
    if (!isPlaceholder(value)) return value;

    switch (value) {
        case "$param":
            return parsed.param ?? value;
        case "$keyword":
            return parsed.keyword ?? value;
        case "$critical":
            return CRITICAL_THRESHOLD;
        case "$halfRange":
            return options.halfRange ?? value;
        default:
            return value;
    }
};

const hydrateCondition = (
    condition: Condition,
    parsed: ParsedAttribute,
    options: HydrateOptions,
): Condition => {
    const hydrated: Condition = {
        ...condition,
        value: resolveValue(
            condition.value as PlaceholderValue,
            parsed,
            options,
        ),
    };

    if (condition.keywords) {
        hydrated.keywords = condition.keywords.map((kw) =>
            typeof kw === "string" && kw === "$keyword" && parsed.keyword
                ? parsed.keyword
                : kw,
        );
    }

    return hydrated;
};

export const hydrateMechanic = (
    template: Mechanic,
    parsed: ParsedAttribute,
    options: HydrateOptions = {},
): Mechanic => {
    const hydrated: Mechanic = {
        ...template,
        value: resolveValue(template.value, parsed, options),
    };

    if (template.conditions) {
        hydrated.conditions = template.conditions.map((c) =>
            hydrateCondition(c, parsed, options),
        );
    }

    return hydrated;
};
