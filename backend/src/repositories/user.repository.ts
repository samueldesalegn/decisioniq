import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.USERS_TABLE || '';

export type UserBilling = {
    userId: string;
    plan: 'FREE' | 'PRO';
    stripeCustomerId?: string;
    subscriptionStatus?: string;
    currentPeriodEnd?: string;
    updatedAt?: string;
};

export async function getUserBilling(userId: string): Promise<UserBilling> {
    const response = await docClient.send(new GetCommand({ TableName: tableName, Key: { userId } }));
    return (response.Item as UserBilling) ?? { userId, plan: 'FREE' };
}

export async function saveUserBilling(user: UserBilling): Promise<void> {
    await docClient.send(
        new PutCommand({
            TableName: tableName,
            Item: { ...user, updatedAt: new Date().toISOString() },
        }),
    );
}

export async function findUserByStripeCustomer(stripeCustomerId: string): Promise<UserBilling | undefined> {
    const response = await docClient.send(
        new QueryCommand({
            TableName: tableName,
            IndexName: 'StripeCustomerIndex',
            KeyConditionExpression: 'stripeCustomerId = :c',
            ExpressionAttributeValues: { ':c': stripeCustomerId },
            Limit: 1,
        }),
    );
    return response.Items?.[0] as UserBilling | undefined;
}

export async function setUserPlan(
    userId: string,
    plan: 'FREE' | 'PRO',
    subscriptionStatus: string,
    currentPeriodEnd?: string,
): Promise<void> {
    await docClient.send(
        new UpdateCommand({
            TableName: tableName,
            Key: { userId },
            UpdateExpression:
                'SET #plan = :plan, subscriptionStatus = :status, currentPeriodEnd = :end, updatedAt = :now',
            ExpressionAttributeNames: { '#plan': 'plan' },
            ExpressionAttributeValues: {
                ':plan': plan,
                ':status': subscriptionStatus,
                ':end': currentPeriodEnd ?? null,
                ':now': new Date().toISOString(),
            },
        }),
    );
}
