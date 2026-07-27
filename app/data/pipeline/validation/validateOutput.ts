/**
 * Runtime validation that a parsed datasheet has the expected shape.
 * Returns an array of error messages (empty = valid).
 */
export function validateDatasheet(data: Record<string, unknown>): string[] {
    const errors: string[] = [];

    function requireString(obj: Record<string, unknown>, key: string, path: string) {
        if (typeof obj[key] !== "string") {
            errors.push(`${path}.${key} must be a string, got ${typeof obj[key]}`);
        }
    }

    function requireArray(obj: Record<string, unknown>, key: string, path: string) {
        if (!Array.isArray(obj[key])) {
            errors.push(`${path}.${key} must be an array, got ${typeof obj[key]}`);
        }
    }

    // Top-level required fields
    requireString(data, "id", "root");
    requireString(data, "name", "root");
    requireString(data, "slug", "root");
    requireString(data, "role", "root");

    // Nested objects
    if (!data.faction || typeof data.faction !== "object") {
        errors.push("root.faction must be an object");
    } else {
        const faction = data.faction as Record<string, unknown>;
        requireString(faction, "id", "faction");
        requireString(faction, "slug", "faction");
    }

    if (!data.source || typeof data.source !== "object") {
        errors.push("root.source must be an object");
    } else {
        const source = data.source as Record<string, unknown>;
        requireString(source, "id", "source");
        requireString(source, "name", "source");
    }

    // Arrays
    requireArray(data, "models", "root");
    requireArray(data, "keywords", "root");
    requireArray(data, "abilities", "root");
    requireArray(data, "pointsCosts", "root");

    // Models validation
    if (Array.isArray(data.models)) {
        for (let i = 0; i < (data.models as unknown[]).length; i++) {
            const model = (data.models as Record<string, unknown>[])[i];
            const path = `models[${i}]`;
            if (typeof model.m !== "number") errors.push(`${path}.m must be a number`);
            if (typeof model.t !== "number") errors.push(`${path}.t must be a number`);
            if (typeof model.sv !== "number") errors.push(`${path}.sv must be a number`);
            if (typeof model.w !== "number") errors.push(`${path}.w must be a number`);
            if (typeof model.line !== "number") errors.push(`${path}.line must be a number`);
            if (!model.composition || typeof model.composition !== "object") {
                errors.push(`${path}.composition must be an object`);
            }
        }
    }

    // Wargear validation
    if (!data.wargear || typeof data.wargear !== "object") {
        errors.push("root.wargear must be an object");
    } else {
        const wargear = data.wargear as Record<string, unknown>;
        requireArray(wargear, "weapons", "wargear");

        if (Array.isArray(wargear.weapons)) {
            for (let i = 0; i < (wargear.weapons as unknown[]).length; i++) {
                const weapon = (wargear.weapons as Record<string, unknown>[])[i];
                const path = `wargear.weapons[${i}]`;
                requireString(weapon, "id", path);
                requireString(weapon, "name", path);
                requireArray(weapon, "profiles", path);
            }
        }
    }

    // PointsCosts validation
    if (Array.isArray(data.pointsCosts)) {
        for (let i = 0; i < (data.pointsCosts as unknown[]).length; i++) {
            const cost = (data.pointsCosts as Record<string, unknown>[])[i];
            const path = `pointsCosts[${i}]`;
            if (typeof cost.cost !== "number") errors.push(`${path}.cost must be a number`);
            if (typeof cost.count !== "number") errors.push(`${path}.count must be a number`);
        }
    }

    return errors;
}
