import { round } from '../utils/math.util';

type Row = Record<string, string>;

export function calculateBusinessKPIs(rows: Row[]) {
    const hasRevenue = rows.every((row) => row.revenue !== undefined);
    const hasCost = rows.every((row) => row.cost !== undefined);

    if (!hasRevenue || !hasCost) {
        return {};
    }

    const totalRevenue = rows.reduce((sum, row) => sum + Number(row.revenue), 0);

    const totalCost = rows.reduce((sum, row) => sum + Number(row.cost), 0);

    const totalProfit = totalRevenue - totalCost;

    const profitMargin = totalRevenue === 0 ? 0 : (totalProfit / totalRevenue) * 100;

    return {
        totalRevenue: round(totalRevenue),
        totalCost: round(totalCost),
        totalProfit: round(totalProfit),
        profitMargin: round(profitMargin),
    };
}
