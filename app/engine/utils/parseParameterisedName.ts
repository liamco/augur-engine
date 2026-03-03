export interface ParsedAttribute {
    key: string;
    param?: number;
    keyword?: string;
}

export const parseParameterisedName = (raw: string): ParsedAttribute => {
    const trimmed = raw.trim();

    // Anti pattern: ANTI-<KEYWORD> <N>+
    const antiMatch = trimmed.match(/^ANTI-(\w+)\s+(\d+)\+?$/i);
    if (antiMatch) {
        return {
            key: "anti",
            param: parseInt(antiMatch[2]),
            keyword: antiMatch[1].toUpperCase(),
        };
    }

    // Trailing number: <NAME> <N> or <NAME> <N>+
    const paramMatch = trimmed.match(/^(.+?)\s+(\d+)\+?$/);
    if (paramMatch) {
        const name = paramMatch[1].trim();
        return {
            key: name.toLowerCase().replace(/\s+/g, "-"),
            param: parseInt(paramMatch[2]),
        };
    }

    // No parameter
    return {
        key: trimmed.toLowerCase().replace(/\s+/g, "-"),
    };
};
