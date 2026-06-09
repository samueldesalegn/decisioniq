import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listAnalysisMetadata } from '../repositories/analysis.repository';
import { failure, success } from '../utils/http-response.util';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const items = await listAnalysisMetadata();

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
