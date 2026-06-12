import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Stripe from 'stripe';
import { getUserBilling, saveUserBilling } from '../repositories/user.repository';
import { getUserIdFromEvent } from '../utils/auth.util';
import { failure, success } from '../utils/http-response.util';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const APP_URL = process.env.APP_URL || 'https://decisioniq.sdcloudhub.com';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const userId = getUserIdFromEvent(event);
        if (!userId) return failure('Unauthorized', 401);

        const user = await getUserBilling(userId);

        // Create (or reuse) a Stripe customer for this user
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({ metadata: { userId } });
            customerId = customer.id;
            await saveUserBilling({ ...user, userId, stripeCustomerId: customerId });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            client_reference_id: userId,
            line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
            success_url: `${APP_URL}/dashboard?billing=success`,
            cancel_url: `${APP_URL}/dashboard?billing=cancelled`,
        });

        return success({ url: session.url });
    } catch (error) {
        console.error('Checkout session failed:', error);
        return failure('Failed to create checkout session');
    }
};
