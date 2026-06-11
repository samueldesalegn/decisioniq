import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listAnalysisMetadataByUser } from '../repositories/analysis.repository';
import { getUserIdFromEvent } from '../utils/auth.util';
import { failure, success } from '../utils/http-response.util';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const userId = getUserIdFromEvent(event);

        if (!userId) {
            return failure('Unauthorized', 401);
        }

        const items = await listAnalysisMetadataByUser(userId);

        const analyses = items
            .map((item) => ({
                analysisId: item.analysisId,
                status: item.status,
                processingMode: item.processingMode,
                datasetType: item.datasetType,
                decisionScore: item.decisionScore,
                rating: item.rating,
                profitMargin: item.profitMargin,
                qualityScore: item.qualityScore,
                fileSizeBytes: item.fileSizeBytes,
                createdAt: item.createdAt,
            }))
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

        return success({
            count: analyses.length,
            analyses,
        });
    } catch (error) {
        console.error(error);
        return failure('Failed to list analyses');
    }
};
