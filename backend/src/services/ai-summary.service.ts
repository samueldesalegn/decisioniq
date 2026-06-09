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

export function generateExecutiveSummary(profile: Profile, businessKPIs: BusinessKPIs, insights: string[]): string {
    if (!businessKPIs.totalRevenue || !businessKPIs.totalProfit) {
        return 'DecisionIQ analyzed the dataset, but there is not enough business KPI information to generate a reliable executive summary.';
    }

    const datasetType = profile.datasetType || 'Unknown dataset';

    return [
        `DecisionIQ analyzed a ${datasetType} dataset with ${profile.rowCount ?? 0} rows.`,
        `The dataset shows total revenue of $${businessKPIs.totalRevenue.toLocaleString()} and total profit of $${businessKPIs.totalProfit.toLocaleString()}.`,
        `The profit margin is ${businessKPIs.profitMargin?.toFixed(2)}%, which ${
            (businessKPIs.profitMargin ?? 0) >= 40
                ? 'indicates strong profitability.'
                : 'suggests profitability should be reviewed.'
        }`,
        `Data quality score is ${profile.qualityScore ?? 0}/100.`,
        insights.length > 0 ? `Key finding: ${insights[insights.length - 1]}` : 'No major insight was generated.',
    ].join(' ');
}
