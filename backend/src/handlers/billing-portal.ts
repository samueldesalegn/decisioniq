import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Stripe from 'stripe';
import { getUserBilling } from '../repositories/user.repository';
import { getUserIdFromEvent } from '../utils/auth.util';
import { failure, success } from '../utils/http-response.util';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const APP_URL = process.env.APP_URL || 'https://decisioniq.sdcloudhub.com';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const userId = getUserIdFromEvent(event);
        if (!userId) return failure('Unauthorized', 401);

        const user = await getUserBilling(userId);
        if (!user.stripeCustomerId) return failure('No billing account found', 404);

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${APP_URL}/dashboard`,
        });

        return success({ url: session.url });
    } catch (error) {
        console.error('Portal session failed:', error);
        return failure('Failed to create portal session');
    }
};
