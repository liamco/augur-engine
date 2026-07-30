/**
 * Weapon attributes arrive as free-text prose on the weapon profile's
 * description — a comma-separated list such as
 * "anti-infantry 4+, devastating wounds, rapid fire 1". Casing is inconsistent
 * across the corpus (pistol / PISTOL / Pistol / and one PISTOl), so every
 * attribute is emitted in the canonical uppercase form the engine's attribute
 * lookup expects: "RAPID FIRE 1", "ANTI-INFANTRY 4+", "DEVASTATING WOUNDS".
 */

/** Attributes carrying no parameter, lowercase. */
const FLAT_ATTRIBUTES = new Set([
    "assault",
    "blast",
    "conversion",
    "c'tan power",
    "devastating wounds",
    "extra attacks",
    "harpooned",
    "hazardous",
    "heavy",
    "ignores cover",
    "indirect fire",
    "lance",
    "lethal hits",
    "one shot",
    "pistol",
    "precision",
    "psychic",
    "torrent",
    "twin-linked",
]);

/** Attributes suffixed with a count, either fixed ("melta 2") or dice ("sustained hits d3"). */
const PARAMETERISED_PATTERN =
    /^(melta|rapid fire|sustained hits)\s+(d?\d+)$/;

/**
 * Anti-X, which encodes both a target keyword and a wound threshold. The "+" is
 * always emitted even where the source omits it, so downstream parsing of the
 * threshold is uniform.
 */
const ANTI_PATTERN = /^anti-([a-z'’]+)\s+(\d+)\+?$/;

function normalise(token: string): string {
    // Brackets appear in some hand-authored data; the generated source doesn't
    // use them, but tolerating them costs nothing.
    return token
        .replace(/[[\]]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * True when an attribute (in canonical uppercase form) matched a known
 * pattern. Unrecognised attributes are still passed through by
 * parseWeaponAttributes so no datasheet text is lost — this reports whether the
 * vocabulary needs extending.
 */
export function isRecognisedWeaponAttribute(attribute: string): boolean {
    const lower = normalise(attribute).toLowerCase();
    return (
        FLAT_ATTRIBUTES.has(lower) ||
        PARAMETERISED_PATTERN.test(lower) ||
        ANTI_PATTERN.test(lower)
    );
}

/**
 * Parse a weapon profile description into its attributes. Unrecognised entries
 * are uppercased and kept rather than dropped — losing datasheet text silently
 * is worse than carrying an attribute the engine has no rule for yet.
 */
export function parseWeaponAttributes(description: string): string[] {
    if (!description?.trim()) return [];

    const attributes: string[] = [];

    for (const token of description.split(",")) {
        const cleaned = normalise(token);
        if (!cleaned) continue;

        const lower = cleaned.toLowerCase();

        const anti = lower.match(ANTI_PATTERN);
        if (anti) {
            attributes.push(`ANTI-${anti[1].toUpperCase()} ${anti[2]}+`);
            continue;
        }

        const parameterised = lower.match(PARAMETERISED_PATTERN);
        if (parameterised) {
            attributes.push(
                `${parameterised[1].toUpperCase()} ${parameterised[2].toUpperCase()}`,
            );
            continue;
        }

        attributes.push(cleaned.toUpperCase());
    }

    return attributes;
}
