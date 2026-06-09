type BusinessKPIs = {
    totalRevenue?: number;
    totalCost?: number;
    totalProfit?: number;
    profitMargin?: number;
};

type Profile = {
    datasetType?: string;
    rowCount?: number;
    qualityScore?: number;
};

export function generateRecommendations(profile: Profile, businessKPIs: BusinessKPIs): string[] {
    const recommendations: string[] = [];

    if (!businessKPIs.totalRevenue || businessKPIs.totalRevenue <= 0) {
        recommendations.push('Add valid revenue data before using this dataset for business decisions.');

        return recommendations;
    }

    if ((profile.rowCount ?? 0) < 30) {
        recommendations.push('Use more historical data before making major forecasting or strategic decisions.');
    }

    if ((profile.qualityScore ?? 0) < 90) {
        recommendations.push(
            'Improve data quality by fixing missing or incomplete values before relying on this analysis.',
        );
    }

    if ((businessKPIs.profitMargin ?? 0) >= 40) {
        recommendations.push('Maintain the current pricing and cost structure because the profit margin is strong.');
    } else if ((businessKPIs.profitMargin ?? 0) >= 20) {
        recommendations.push(
            'Review operating costs and pricing because profitability is acceptable but not exceptional.',
        );
    } else {
        recommendations.push('Prioritize cost reduction or pricing adjustments because profitability is weak.');
    }

    if ((businessKPIs.totalCost ?? 0) > businessKPIs.totalRevenue * 0.7) {
        recommendations.push('Investigate cost drivers because costs represent more than 70% of revenue.');
    }

    if ((businessKPIs.totalProfit ?? 0) > 0) {
        recommendations.push('Continue monitoring revenue and cost trends to protect profitability over time.');
    } else {
        recommendations.push('Take immediate action to reduce losses because the dataset shows negative profit.');
    }

    return recommendations;
}
