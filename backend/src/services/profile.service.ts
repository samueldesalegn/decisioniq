import { isDateLike, isNumeric } from '../utils/data-type.util';

type Row = Record<string, string>;

export function profileDataset(rows: Row[]) {
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    const numericColumns = columns.filter((column) => rows.some((row) => isNumeric(row[column])));

    const dateColumns = columns.filter((column) => rows.some((row) => isDateLike(row[column])));

    const categoricalColumns = columns.filter(
        (column) => !numericColumns.includes(column) && !dateColumns.includes(column),
    );

    const datasetType = detectDatasetType(columns);

    return {
        datasetType,
        confidence: datasetType === 'Unknown' ? 0.3 : 0.85,
        rowCount: rows.length,
        columnCount: columns.length,
        columns,
        numericColumns,
        dateColumns,
        categoricalColumns,
        qualityScore: calculateQualityScore(rows, columns),
        missingValues: countMissingValues(rows, columns),
    };
}

function detectDatasetType(columns: string[]): string {
    const normalized = columns.map((column) => column.toLowerCase());

    if (
        normalized.some((c) => c.includes('revenue')) ||
        normalized.some((c) => c.includes('sales')) ||
        normalized.some((c) => c.includes('cost'))
    ) {
        return 'Business Performance';
    }

    if (
        normalized.some((c) => c.includes('device')) ||
        normalized.some((c) => c.includes('temperature')) ||
        normalized.some((c) => c.includes('sensor'))
    ) {
        return 'IoT Telemetry';
    }

    if (
        normalized.some((c) => c.includes('property')) ||
        normalized.some((c) => c.includes('rent')) ||
        normalized.some((c) => c.includes('mortgage'))
    ) {
        return 'Real Estate';
    }

    return 'Unknown';
}

function calculateQualityScore(rows: Row[], columns: string[]): number {
    const totalCells = rows.length * columns.length;

    if (totalCells === 0) {
        return 0;
    }

    const missingValues = countMissingValues(rows, columns);
    const missingRate = missingValues / totalCells;

    return Math.round((1 - missingRate) * 100);
}

function countMissingValues(rows: Row[], columns: string[]): number {
    let count = 0;

    for (const row of rows) {
        for (const column of columns) {
            const value = row[column];

            if (!value || value.trim() === '') {
                count++;
            }
        }
    }

    return count;
}
