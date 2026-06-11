import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION || 'us-east-1' });

// Verify the exact model/inference-profile ID in Bedrock console → Model access
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-6';

type BusinessKPIs = {
    totalRevenue?: number;
    totalCost?: number;
    totalProfit?: number;
    profitMargin?: number;
};

type Profile = {
    datasetType?: string;
    rowCount?: number;
    columnCount?: number;
    qualityScore?: number;
};

type TrendPoint = {
    date?: string;
    revenue?: number;
    cost?: number;
    profit?: number;
};

export async function generateExecutiveSummary(
    profile: Profile,
    businessKPIs: BusinessKPIs,
    insights: string[],
    trendSeries: TrendPoint[] = [],
): Promise<string> {
    try {
        const prompt = buildPrompt(profile, businessKPIs, insights, trendSeries);

        const command = new InvokeModelCommand({
            modelId: MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 600,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });

        const response = await bedrock.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const summary = responseBody.content?.[0]?.text?.trim();

        if (summary) {
            return summary;
        }

        console.warn('Bedrock returned empty summary, using fallback');
        return fallbackSummary(profile, businessKPIs, insights);
    } catch (error) {
        // Never fail the whole analysis because the AI summary failed
        console.error('Bedrock summary generation failed, using fallback:', error);
        return fallbackSummary(profile, businessKPIs, insights);
    }
}

function buildPrompt(
    profile: Profile,
    businessKPIs: BusinessKPIs,
    insights: string[],
    trendSeries: TrendPoint[],
): string {
    return `You are a senior business analyst writing an executive summary for a business intelligence report.

Dataset profile:
- Type: ${profile.datasetType ?? 'Unknown'}
- Rows: ${profile.rowCount ?? 'Unknown'}
- Columns: ${profile.columnCount ?? 'Unknown'}
- Data quality score: ${profile.qualityScore ?? 'Unknown'}/100

Key performance indicators:
- Total revenue: $${businessKPIs.totalRevenue?.toLocaleString() ?? 'N/A'}
- Total cost: $${businessKPIs.totalCost?.toLocaleString() ?? 'N/A'}
- Total profit: $${businessKPIs.totalProfit?.toLocaleString() ?? 'N/A'}
- Profit margin: ${businessKPIs.profitMargin ?? 'N/A'}%

Rule-based insights already computed:
${insights.map((i) => `- ${i}`).join('\n')}

Time series (date, revenue, cost, profit):
${trendSeries.map((p) => `${p.date}: revenue=${p.revenue}, cost=${p.cost}, profit=${p.profit}`).join('\n')}

Write a 3-4 paragraph executive summary in plain professional English. Requirements:
- Lead with the overall financial health verdict
- Identify any notable mid-period patterns in the time series (sustained declines, recoveries, margin compression, inflection points) — do not just compare first vs last period
- Mention concrete numbers sparingly and only where they strengthen a point
- End with the single most important thing a decision-maker should act on
- No headers, no bullet points, no preamble — output only the summary text`;
}

function fallbackSummary(profile: Profile, businessKPIs: BusinessKPIs, insights: string[]): string {
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
