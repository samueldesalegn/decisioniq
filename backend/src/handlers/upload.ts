import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { findAnalysisByFileHash } from '../repositories/analysis.repository';
import { failure, success } from '../utils/http-response.util';

const s3 = new S3Client({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const body = JSON.parse(event.body || '{}');

        const fileName = body.fileName;
        const contentType = body.contentType || 'text/csv';
        const fileHash = body.fileHash;

        if (!fileName) {
            return failure('fileName is required', 400);
        }

        if (fileHash) {
            const existingAnalysis = await findAnalysisByFileHash(fileHash);

            if (existingAnalysis) {
                return success({
                    duplicate: true,
                    analysisId: existingAnalysis.analysisId,
                    status: existingAnalysis.status,
                    datasetType: existingAnalysis.datasetType,
                    decisionScore: existingAnalysis.decisionScore,
                    rating: existingAnalysis.rating,
                    message: 'This file has already been analyzed.',
                });
            }
        }

        const datasetId = randomUUID();
        const key = `raw/${datasetId}/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.UPLOAD_BUCKET,
            Key: key,
            ContentType: contentType,
            Metadata: {
                ...(fileHash ? { fileHash } : {}),
            },
        });

        const uploadUrl = await getSignedUrl(s3, command, {
            expiresIn: 900,
        });

        return success({
            duplicate: false,
            datasetId,
            uploadUrl,
            key,
            fileHash,
        });
    } catch (error) {
        console.error(error);
        return failure('Failed to generate upload URL');
    }
};
