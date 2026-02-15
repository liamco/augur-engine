export interface DiceResult {
    expected: number;
    expression: string;
    isFixed: boolean;
}

export const parseDiceExpression = (
    value: number | string,
): DiceResult => {
    if (typeof value === "number") {
        return { expected: value, expression: String(value), isFixed: true };
    }

    const str = value.toUpperCase().trim();

    // "D6+1", "D3+2", "2D6", "D6", "D3"
    const diceMatch = str.match(/^(\d*)D(\d+)([+-]\d+)?$/);
    if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const sides = parseInt(diceMatch[2]);
        const modifier = diceMatch[3] ? parseInt(diceMatch[3]) : 0;
        const avgPerDie = (sides + 1) / 2;
        const expected = count * avgPerDie + modifier;
        return { expected, expression: str, isFixed: false };
    }

    // Plain number as string
    const num = parseInt(str);
    if (!isNaN(num)) {
        return { expected: num, expression: str, isFixed: true };
    }

    return { expected: 0, expression: str, isFixed: false };
};
