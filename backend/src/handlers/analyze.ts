import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { saveAnalysisMetadata, countAnalysesThisMonth } from '../repositories/analysis.repository';
import { getUserBilling } from '../repositories/user.repository';
import { getS3ObjectSize, readS3ObjectAsText, writeJsonToS3 } from '../services/s3.service';
import { parseCsv } from '../services/parser.service';
import { analyzeRows } from '../services/analysis.service';
import { profileDataset } from '../services/profile.service';
import { calculateBusinessKPIs } from '../services/business-kpi.service';
import { generateInsights } from '../services/insight.service';
import { generateExecutiveSummary } from '../services/ai-summary.service';
import { generateRecommendations } from '../services/recommendation.service';
import { generateRisks } from '../services/risk.service';
import { calculateDecisionScore } from '../services/decision-score.service';
import { calculateTrends } from '../services/trend.service';
import { failure, success } from '../utils/http-response.util';
import { buildTrendSeries } from '../services/trend-series.service';
import { getUserIdFromEvent } from '../utils/auth.util';

const LARGE_FILE_THRESHOLD_BYTES = 50 * 1024 * 1024;
const FREE_TIER_LIMIT = 3;
const PRO_FAIR_USE_LIMIT = 500;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || '{}');

        if (!body.bucket || !body.key) {
            return failure('bucket and key are required', 400);
        }

        const userId = getUserIdFromEvent(event);

        if (!userId) {
            return failure('Unauthorized', 401);
        }

        // Billing enforcement
        const billing = await getUserBilling(userId);

        if (billing.plan === 'PRO') {
            // "Unlimited" in practice is a high fair-use ceiling, to prevent
            // runaway Bedrock costs from scripted or abusive usage.
            const used = await countAnalysesThisMonth(userId);

            if (used >= PRO_FAIR_USE_LIMIT) {
                return failure('Monthly fair-use limit reached. Please contact support for higher-volume needs.', 429);
            }
        } else {
            // Free tier: limited to FREE_TIER_LIMIT analyses per month
            const used = await countAnalysesThisMonth(userId);

            if (used >= FREE_TIER_LIMIT) {
                return failure(
                    `Free plan limit reached (${FREE_TIER_LIMIT} analyses/month). Upgrade to Pro for unlimited analyses.`,
                    402,
                );
            }
        }

        const fileHash: string | undefined = body.fileHash;

        const fileSizeBytes = await getS3ObjectSize(body.bucket, body.key);

        if (fileSizeBytes > LARGE_FILE_THRESHOLD_BYTES) {
            const analysisId = randomUUID();
            const createdAt = new Date().toISOString();

            await saveAnalysisMetadata({
                analysisId,
                userId,
                datasetKey: body.key,
                bucket: body.bucket,
                status: 'QUEUED',
                processingMode: 'BIG_DATA',
                fileSizeBytes,
                createdAt,
                ...(fileHash ? { fileHash } : {}),
            });

            return success(
                {
                    analysisId,
                    status: 'QUEUED',
                    processingMode: 'BIG_DATA',
                    fileSizeBytes,
                    message: 'Large dataset detected. Analysis has been queued for big-data processing.',
                },
                202,
            );
        }

        const csvText = await readS3ObjectAsText(body.bucket, body.key);
        const rows = parseCsv(csvText);

        const analysis = analyzeRows(rows);
        const profile = profileDataset(rows);
        const businessKPIs = calculateBusinessKPIs(rows);
        const recommendations = generateRecommendations(profile, businessKPIs);
        const risks = generateRisks(profile, businessKPIs);
        const decisionScore = calculateDecisionScore(profile, businessKPIs);
        const trends = calculateTrends(rows, profile.numericColumns);
        const insights = generateInsights(businessKPIs, trends);
        const trendSeries = buildTrendSeries(rows);

        const executiveSummary = await generateExecutiveSummary(profile, businessKPIs, insights, trendSeries);

        const analysisId = randomUUID();
        const createdAt = new Date().toISOString();

        const result = {
            bucket: body.bucket,
            key: body.key,
            processingMode: 'LAMBDA',
            fileSizeBytes,
            businessKPIs,
            insights,
            profile,
            analysis,
            executiveSummary,
            recommendations,
            risks,
            decisionScore,
            trends,
            trendSeries,
        };

        const resultBucket = process.env.RESULT_BUCKET || '';
        const resultKey = `analysis-results/${userId}/${analysisId}.json`;

        await writeJsonToS3(resultBucket, resultKey, result);

        await saveAnalysisMetadata({
            analysisId,
            userId,
            datasetKey: body.key,
            bucket: body.bucket,
            status: 'COMPLETED',
            processingMode: 'LAMBDA',
            fileSizeBytes,
            createdAt,

            ...(fileHash ? { fileHash } : {}),

            datasetType: profile.datasetType,
            decisionScore: decisionScore.score,
            rating: decisionScore.rating,

            totalRevenue: businessKPIs.totalRevenue,
            totalCost: businessKPIs.totalCost,
            totalProfit: businessKPIs.totalProfit,
            profitMargin: businessKPIs.profitMargin,

            qualityScore: profile.qualityScore,
            rowCount: profile.rowCount,
            columnCount: profile.columnCount,

            insightCount: insights.length,
            recommendationCount: recommendations.length,
            riskCount: risks.length,

            resultBucket,
            resultKey,
        });

        return success({
            analysisId,
            status: 'COMPLETED',
            processingMode: 'LAMBDA',
            resultLocation: {
                bucket: resultBucket,
                key: resultKey,
            },
            summary: {
                datasetType: profile.datasetType,
                decisionScore,
                businessKPIs,
                qualityScore: profile.qualityScore,
                insightCount: insights.length,
                recommendationCount: recommendations.length,
                riskCount: risks.length,
                fileSizeBytes,
            },
            result,
        });
    } catch (error) {
        console.error(error);
        return failure('Failed to analyze dataset');
    }
};
