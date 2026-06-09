import { isDateLike, isNumeric } from '../utils/data-type.util';
import { average, median, round, sum } from '../utils/math.util';

type Row = Record<string, string>;

export function analyzeRows(rows: Row[]) {
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    const profile = {
        rowCount: rows.length,
        columnCount: columns.length,
        columns,
        missingValues: countMissingValues(rows, columns),
    };

    const numericColumns = columns.filter((column) => rows.some((row) => isNumeric(row[column])));

    const dateColumns = columns.filter((column) => rows.some((row) => isDateLike(row[column])));

    const categoricalColumns = columns.filter(
        (column) => !numericColumns.includes(column) && !dateColumns.includes(column),
    );

    const statistics: Record<string, unknown> = {};

    for (const column of numericColumns) {
        const values = rows.map((row) => Number(row[column])).filter((value) => !Number.isNaN(value));

        statistics[column] = {
            sum: round(sum(values)),
            average: round(average(values)),
            min: round(Math.min(...values)),
            max: round(Math.max(...values)),
            median: round(median(values)),
        };
    }

    return {
        profile,
        schema: {
            numericColumns,
            dateColumns,
            categoricalColumns,
        },
        statistics,
    };
}

function countMissingValues(rows: Row[], columns: string[]): number {
    let count = 0;

    for (const row of rows) {
        for (const column of columns) {
            const value = row[column];

            if (value === undefined || value === null || value.trim() === '') {
                count++;
            }
        }
    }

    return count;
}
