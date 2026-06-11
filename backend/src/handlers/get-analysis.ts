import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getAnalysisMetadata } from '../repositories/analysis.repository';
import { readJsonFromS3 } from '../services/s3.service';
import { getUserIdFromEvent } from '../utils/auth.util';
import { failure, success } from '../utils/http-response.util';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const analysisId = event.pathParameters?.analysisId;

        if (!analysisId) {
            return failure('analysisId is required', 400);
        }

        const userId = getUserIdFromEvent(event);

        if (!userId) {
            return failure('Unauthorized', 401);
        }

        const metadata = await getAnalysisMetadata(analysisId);

        if (!metadata) {
            return failure('Analysis not found', 404);
        }

        // Ownership check — users can only access their own analyses
        if (metadata.userId !== userId) {
            return failure('Forbidden', 403);
        }

        if (metadata.status === 'QUEUED') {
            return success({
                analysisId,
                status: metadata.status,
                processingMode: metadata.processingMode,
                metadata,
            });
        }

        const resultBucket = metadata.resultBucket as string;
        const resultKey = metadata.resultKey as string;

        if (!resultBucket || !resultKey) {
            return failure('Analysis result location is missing', 500);
        }

        const result = await readJsonFromS3<Record<string, unknown>>(resultBucket, resultKey);

        return success({
            analysisId,
            status: metadata.status,
            metadata,
            result,
        });
    } catch (error) {
        console.error(error);
        return failure('Failed to get analysis');
    }
};
