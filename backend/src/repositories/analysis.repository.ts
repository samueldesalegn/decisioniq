import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});

const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.ANALYSIS_TABLE || '';

export async function saveAnalysisMetadata(item: Record<string, unknown>): Promise<void> {
    await docClient.send(
        new PutCommand({
            TableName: tableName,
            Item: item,
        }),
    );
}

export async function getAnalysisMetadata(analysisId: string): Promise<Record<string, unknown> | undefined> {
    const response = await docClient.send(
        new GetCommand({
            TableName: tableName,
            Key: {
                analysisId,
            },
        }),
    );

    return response.Item;
}

/**
 * List analyses belonging to a specific user.
 * Uses the "UserIdIndex" GSI — Query, not Scan.
 */
export async function listAnalysisMetadataByUser(userId: string): Promise<Record<string, unknown>[]> {
    const response = await docClient.send(
        new QueryCommand({
            TableName: tableName,
            IndexName: 'UserIdIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
            Limit: 100,
        }),
    );

    return response.Items ?? [];
}

/**
 * Find an existing analysis by file hash, scoped to the requesting user.
 * Requires the "FileHashIndex" GSI.
 */
export async function findAnalysisByFileHashAndUser(
    fileHash: string,
    userId: string,
): Promise<Record<string, unknown> | undefined> {
    const response = await docClient.send(
        new QueryCommand({
            TableName: tableName,
            IndexName: 'FileHashIndex',
            KeyConditionExpression: 'fileHash = :fileHash',
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':fileHash': fileHash,
                ':userId': userId,
            },
        }),
    );

    return response.Items?.[0];
}
