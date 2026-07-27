const DICE_PATTERN = /^\d*D\d+([+-]\d+)?$/i;

/** "12\"" → 12, "-" → null */
export function parseMovement(raw: string): number | null {
    if (raw === "-") return null;
    return parseInt(raw.replace('"', ""), 10);
}

/** "4+" → 4, "-" → null (for BS/WS, Sv, Ld) */
export function parseSkill(raw: string): number | null {
    if (raw === "-") return null;
    return parseInt(raw.replace("+", ""), 10);
}

/** "4+" → 4, "-" → null (for invulnerable saves) */
export function parseSaveStat(raw: string): number | null {
    if (raw === "-") return null;
    return parseInt(raw.replace("+", ""), 10);
}

/** "6" → 6, "D6" → "D6", "2D6+1" → "2D6+1", "-" → null */
export function parseDamageOrAttacks(raw: string): number | string | null {
    if (raw === "-") return null;
    if (DICE_PATTERN.test(raw)) return raw;
    const n = parseInt(raw, 10);
    if (!isNaN(n)) return n;
    return raw;
}

/** "-" → null, "6" → 6, plain integer parse */
export function parseIntOrNull(raw: string): number | null {
    if (raw === "-") return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
}

/** "true" → true, "false" → false */
export function parseBoolString(raw: string): boolean {
    return raw === "true";
}

/**
 * Parse weapon range: "Melee" stays as string, '18"' → 18, "-" → null
 */
export function parseRange(raw: string): number | string | null {
    if (raw === "Melee") return "Melee";
    if (raw === "-") return null;
    return parseInt(raw.replace('"', ""), 10);
}

/**
 * Parse weapon BS/WS: "2" → 2, "-" → "N/A" (torrent weapons), "4+" → 4
 */
export function parseWeaponSkill(raw: string): number | string {
    if (raw === "-") return "N/A";
    return parseInt(raw.replace("+", ""), 10);
}
