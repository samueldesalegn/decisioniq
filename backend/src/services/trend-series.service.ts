type Row = Record<string, string>;

export function buildTrendSeries(rows: Row[]) {
    return rows.map((row) => ({
        date: row['date'],
        revenue: Number(row['revenue']),
        cost: Number(row['cost']),
        profit: Number(row['revenue']) - Number(row['cost']),
    }));
}
