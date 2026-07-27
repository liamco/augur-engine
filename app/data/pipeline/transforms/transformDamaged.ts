export interface ParsedDamagedProfile {
    range: string;
    threshold: number;
    description: string;
    mechanics: never[];
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").trim();
}

function parseThreshold(damagedW: string): { range: string; threshold: number } {
    // damagedW is like "1-5" or just "5"
    const match = damagedW.match(/(\d+)(?:-(\d+))?/);
    if (!match) return { range: damagedW, threshold: 0 };

    if (match[2]) {
        // "1-5" format: range is the full string, threshold is the upper bound
        return {
            range: `${match[1]}-${match[2]}`,
            threshold: parseInt(match[2], 10),
        };
    }
    // Just a number like "5"
    const n = parseInt(match[1], 10);
    return { range: `1-${n}`, threshold: n };
}

export function transformDamaged(
    damagedW: string,
    damagedDescription: string,
): ParsedDamagedProfile | null {
    if (!damagedW && !damagedDescription) return null;
    if (!damagedW) return null;

    const { range, threshold } = parseThreshold(damagedW);

    return {
        range,
        threshold,
        description: stripHtml(damagedDescription),
        mechanics: [],
    };
}
