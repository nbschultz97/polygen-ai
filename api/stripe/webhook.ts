/**
 * Stripe Webhook Handler
 * Processes subscription events and updates user tiers
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Tier limits matching authService.ts
const TIER_LIMITS = {
  free: 5,
  pro: 100,
  enterprise: -1 // unlimited
};

export const config = {
  runtime: 'edge',
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ||
              process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function updateUserTier(
  userId: string,
  tier: 'free' | 'pro' | 'enterprise',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('Supabase not configured');
    return false;
  }

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
    return false;
  }

  return true;
}

async function findUserByCustomerId(customerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !data) return null;
  return data.id;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY not configured');
    return new Response('Server configuration error', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2024-12-18.acacia'
  });

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      // Verify webhook signature in production
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // For development/testing without webhook secret
      event = JSON.parse(body) as Stripe.Event;
      console.warn('Webhook signature verification skipped - configure STRIPE_WEBHOOK_SECRET for production');
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const tier = session.metadata?.tier as 'pro' | 'enterprise';

        if (userId && tier) {
          await updateUserTier(
            userId,
            tier,
            session.customer as string,
            session.subscription as string
          );
          console.log(`User ${userId} upgraded to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const tier = subscription.metadata?.tier as 'pro' | 'enterprise';

        if (userId && tier && subscription.status === 'active') {
          await updateUserTier(
            userId,
            tier,
            subscription.customer as string,
            subscription.id
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId ||
                       await findUserByCustomerId(subscription.customer as string);

        if (userId) {
          // Downgrade to free tier
          await updateUserTier(userId, 'free');
          console.log(`User ${userId} downgraded to free (subscription cancelled)`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`Payment failed for customer ${invoice.customer}`);
        // Could send notification email here
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
    console.error('Webhook processing error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}
