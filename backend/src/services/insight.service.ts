type BusinessKPIs = {
    totalRevenue?: number;
    totalCost?: number;
    totalProfit?: number;
    profitMargin?: number;
};

type TrendResult = {
    firstValue: number;
    lastValue: number;
    change: number;
    changePercent: number;
    direction: 'upward' | 'downward' | 'flat';
};

type Trends = Record<string, TrendResult>;

export function generateInsights(kpis: BusinessKPIs, trends: Trends = {}): string[] {
    const insights: string[] = [];

    if (
        kpis.totalRevenue === undefined ||
        kpis.totalCost === undefined ||
        kpis.totalProfit === undefined ||
        kpis.profitMargin === undefined
    ) {
        return insights;
    }

    insights.push(`Total revenue is $${kpis.totalRevenue.toLocaleString()}.`);
    insights.push(`Total operating cost is $${kpis.totalCost.toLocaleString()}.`);
    insights.push(`Total profit is $${kpis.totalProfit.toLocaleString()}.`);
    insights.push(`Profit margin is ${kpis.profitMargin.toFixed(2)}%.`);

    if (kpis.profitMargin >= 40) {
        insights.push('The business demonstrates strong profitability with a healthy profit margin.');
    } else if (kpis.profitMargin >= 20) {
        insights.push('The business is profitable, but there is room for margin improvement.');
    } else {
        insights.push('Profitability is relatively low and operational costs should be reviewed.');
    }

    if (kpis.totalRevenue > kpis.totalCost) {
        insights.push(`Revenue exceeds cost by $${kpis.totalProfit.toLocaleString()}.`);
    } else {
        insights.push('Costs exceed revenue, indicating a negative operating position.');
    }

    addTrendInsights(insights, trends);

    return insights;
}

function addTrendInsights(insights: string[], trends: Trends): void {
    const revenueTrend = trends.revenue;
    const costTrend = trends.cost;

    if (revenueTrend) {
        insights.push(
            `Revenue moved ${revenueTrend.direction}, changing by ${revenueTrend.changePercent}% from the first period to the last period.`,
        );
    }

    if (costTrend) {
        insights.push(
            `Cost moved ${costTrend.direction}, changing by ${costTrend.changePercent}% from the first period to the last period.`,
        );
    }

    if (revenueTrend && costTrend) {
        if (revenueTrend.changePercent > costTrend.changePercent) {
            insights.push('Revenue is growing faster than cost, which is a positive operating signal.');
        } else if (costTrend.changePercent > revenueTrend.changePercent) {
            insights.push('Cost is growing faster than revenue, which may pressure future profitability.');
        } else {
            insights.push('Revenue and cost are moving at the same rate.');
        }
    }
}
