import { Operator } from "@/app/types/Mechanic";

export const evaluateOperator = (
    operator: Operator,
    actual: boolean | number | string | string[] | undefined,
    expected: boolean | number | string | string[],
): boolean => {
    switch (operator) {
        case "equals":
            return actual === expected;

        case "notEquals":
            return actual !== expected;

        case "greaterThan":
            return typeof actual === "number" && actual > (expected as number);

        case "greaterThanOrEqualTo":
            return (
                typeof actual === "number" && actual >= (expected as number)
            );

        case "lessThan":
            return typeof actual === "number" && actual < (expected as number);

        case "lessThanOrEqualTo":
            return (
                typeof actual === "number" && actual <= (expected as number)
            );

        case "includes":
            if (Array.isArray(actual)) {
                if (Array.isArray(expected)) {
                    return expected.every((v) => actual.includes(v));
                }
                return actual.includes(expected as string);
            }
            return false;

        case "notIncludes":
            if (Array.isArray(actual)) {
                if (Array.isArray(expected)) {
                    return !expected.some((v) => actual.includes(v));
                }
                return !actual.includes(expected as string);
            }
            return true;

        case "ratioOf":
            return (
                typeof actual === "number" &&
                typeof expected === "number" &&
                Math.floor(actual / expected) > 0
            );
    }
};
