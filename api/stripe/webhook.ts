/**
 * Stripe Webhook Handler
 * Processes subscription events and updates user tiers
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Tier limits
const TIER_LIMITS = {
  free: 5,
  pro: 100,
  enterprise: -1
};

export const config = {
  runtime: 'edge'
};

async function updateUserTier(
  userId: string,
  tier: 'free' | 'pro' | 'enterprise',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
) {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      tier,
      generations_limit: TIER_LIMITS[tier],
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update user tier:', error);
    throw error;
  }
}

function determineTierFromPrice(priceId: string): 'free' | 'pro' | 'enterprise' {
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proYearly = process.env.STRIPE_PRO_YEARLY_PRICE_ID;
  const enterpriseMonthly = process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID;
  const enterpriseYearly = process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID;

  if (priceId === proMonthly || priceId === proYearly) {
    return 'pro';
  }
  if (priceId === enterpriseMonthly || priceId === enterpriseYearly) {
    return 'enterprise';
  }
  return 'free';
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new Response(JSON.stringify({ error: 'Missing signature or webhook secret' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (userId && subscriptionId) {
          // Get subscription details to determine tier
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;
          const tier = determineTierFromPrice(priceId);

          await updateUserTier(userId, tier, customerId, subscriptionId);
          console.log(`User ${userId} upgraded to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const priceId = subscription.items.data[0]?.price.id;

        if (userId && priceId) {
          const tier = determineTierFromPrice(priceId);
          await updateUserTier(
            userId,
            tier,
            subscription.customer as string,
            subscription.id
          );
          console.log(`User ${userId} subscription updated to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await updateUserTier(userId, 'free');
          console.log(`User ${userId} downgraded to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;

          if (userId) {
            // Optionally notify user of failed payment
            console.log(`Payment failed for user ${userId}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
