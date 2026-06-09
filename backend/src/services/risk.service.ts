type BusinessKPIs = {
    totalRevenue?: number;
    totalCost?: number;
    totalProfit?: number;
    profitMargin?: number;
};

type Profile = {
    rowCount?: number;
    qualityScore?: number;
    missingValues?: number;
};

export function generateRisks(profile: Profile, businessKPIs: BusinessKPIs): string[] {
    const risks: string[] = [];

    if ((profile.rowCount ?? 0) < 30) {
        risks.push('Dataset has fewer than 30 rows, so forecasting and trend confidence are limited.');
    }

    if ((profile.qualityScore ?? 100) < 90) {
        risks.push('Data quality is below 90%, which may reduce the reliability of insights and recommendations.');
    }

    if ((profile.missingValues ?? 0) > 0) {
        risks.push('Dataset contains missing values that should be cleaned before making important decisions.');
    }

    if ((businessKPIs.totalRevenue ?? 0) <= 0) {
        risks.push('Revenue is missing or zero, so business performance cannot be evaluated reliably.');
    }

    if ((businessKPIs.profitMargin ?? 0) < 20) {
        risks.push('Profit margin is below 20%, which may indicate weak profitability or cost pressure.');
    }

    if ((businessKPIs.totalCost ?? 0) > (businessKPIs.totalRevenue ?? 0) * 0.8) {
        risks.push('Costs represent more than 80% of revenue, which may expose the business to margin pressure.');
    }

    if (risks.length === 0) {
        risks.push(
            'No major risk flags were detected from the current dataset, but continued monitoring is recommended.',
        );
    }

    return risks;
}
