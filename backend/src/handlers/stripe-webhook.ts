import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Stripe from 'stripe';
import {
    findUserByStripeCustomer,
    setUserPlan,
    getUserBilling,
    saveUserBilling,
} from '../repositories/user.repository';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const signature = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];
        if (!signature || !event.body) {
            return { statusCode: 400, body: 'Missing signature or body' };
        }

        let stripeEvent: Stripe.Event;
        try {
            stripeEvent = stripe.webhooks.constructEvent(event.body, signature, webhookSecret);
        } catch (err) {
            console.error('Webhook signature verification failed:', err);
            return { statusCode: 400, body: 'Invalid signature' };
        }

        switch (stripeEvent.type) {
            case 'checkout.session.completed': {
                const session = stripeEvent.data.object as Stripe.Checkout.Session;
                const userId = session.client_reference_id;
                const customerId = session.customer as string;
                if (userId) {
                    const user = await getUserBilling(userId);
                    await saveUserBilling({
                        ...user,
                        userId,
                        stripeCustomerId: customerId,
                        plan: 'PRO',
                        subscriptionStatus: 'active',
                    });
                    console.log(`User ${userId} upgraded to PRO`);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const sub = stripeEvent.data.object as Stripe.Subscription;
                const user = await findUserByStripeCustomer(sub.customer as string);
                if (user) {
                    const active = sub.status === 'active' || sub.status === 'trialing';
                    const periodEnd = new Date((sub as any).current_period_end * 1000).toISOString();
                    await setUserPlan(user.userId, active ? 'PRO' : 'FREE', sub.status, periodEnd);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const sub = stripeEvent.data.object as Stripe.Subscription;
                const user = await findUserByStripeCustomer(sub.customer as string);
                if (user) {
                    await setUserPlan(user.userId, 'FREE', 'cancelled');
                    console.log(`User ${user.userId} downgraded to FREE`);
                }
                break;
            }

            default:
                // Ignore other events
                break;
        }

        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    } catch (error) {
        console.error('Webhook handler failed:', error);
        return { statusCode: 500, body: 'Webhook error' };
    }
};
