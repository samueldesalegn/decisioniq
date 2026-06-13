import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserBilling } from '../repositories/user.repository';
import { countAnalysesThisMonth } from '../repositories/analysis.repository';
import { getUserIdFromEvent } from '../utils/auth.util';
import { failure, success } from '../utils/http-response.util';

const FREE_TIER_LIMIT = 3;
const PRO_FAIR_USE_LIMIT = 500;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const userId = getUserIdFromEvent(event);
        if (!userId) return failure('Unauthorized', 401);

        const [user, usedThisMonth] = await Promise.all([getUserBilling(userId), countAnalysesThisMonth(userId)]);

        return success({
            plan: user.plan,
            subscriptionStatus: user.subscriptionStatus ?? null,
            currentPeriodEnd: user.currentPeriodEnd ?? null,
            usage: {
                used: usedThisMonth,
                limit: user.plan === 'PRO' ? PRO_FAIR_USE_LIMIT : FREE_TIER_LIMIT,
            },
        });
    } catch (error) {
        console.error('Billing status failed:', error);
        return failure('Failed to fetch billing status');
    }
};
