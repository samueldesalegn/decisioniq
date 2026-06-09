import { round } from '../utils/math.util';

type Row = Record<string, string>;

type TrendResult = {
    firstValue: number;
    lastValue: number;
    change: number;
    changePercent: number;
    direction: 'upward' | 'downward' | 'flat';
};

export function calculateTrends(rows: Row[], numericColumns: string[]): Record<string, TrendResult> {
    const trends: Record<string, TrendResult> = {};

    if (rows.length < 2) {
        return trends;
    }

    for (const column of numericColumns) {
        const values = rows.map((row) => Number(row[column])).filter((value) => !Number.isNaN(value));

        if (values.length < 2) {
            continue;
        }

        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        const change = lastValue - firstValue;

        const changePercent = firstValue === 0 ? 0 : (change / firstValue) * 100;

        trends[column] = {
            firstValue: round(firstValue),
            lastValue: round(lastValue),
            change: round(change),
            changePercent: round(changePercent),
            direction: getDirection(change),
        };
    }

    return trends;
}

function getDirection(change: number): 'upward' | 'downward' | 'flat' {
    if (change > 0) {
        return 'upward';
    }

    if (change < 0) {
        return 'downward';
    }

    return 'flat';
}
