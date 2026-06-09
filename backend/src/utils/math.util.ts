export function sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
}

export function average(values: number[]): number {
    return values.length === 0 ? 0 : sum(values) / values.length;
}

export function median(values: number[]): number {
    if (values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

export function round(value: number): number {
    return Math.round(value * 100) / 100;
}
