import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

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

export async function listAnalysisMetadata(): Promise<Record<string, unknown>[]> {
    const response = await docClient.send(
        new ScanCommand({
            TableName: tableName,
            Limit: 50,
        }),
    );

    return response.Items ?? [];
}

/**
 * Find an existing analysis by file hash.
 * Requires a GSI named "FileHashIndex".
 */
export async function findAnalysisByFileHash(fileHash: string): Promise<Record<string, unknown> | undefined> {
    const response = await docClient.send(
        new QueryCommand({
            TableName: tableName,
            IndexName: 'FileHashIndex',
            KeyConditionExpression: 'fileHash = :fileHash',
            ExpressionAttributeValues: {
                ':fileHash': fileHash,
            },
            Limit: 1,
        }),
    );

    return response.Items?.[0];
}
