/**
 * Stripe Checkout Session API
 * Creates a checkout session for subscription upgrades
 */

import Stripe from 'stripe';
import { verifyAuth, authError } from '../lib/auth';

// Price IDs for subscription tiers
const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_1StvSH2F3wOoNwibyk0SrBei',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_1StvSa2F3wOoNwibbsM0WOac'
};

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify authentication
  const auth = await verifyAuth(req);
  if (!auth.success) {
    return authError(auth.error || 'Unauthorized', auth.status || 401);
  }

  // Get Stripe secret key
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY not configured');
    return authError('Payment system not configured', 500);
  }

  try {
    const body = await req.json();
    const { tier, successUrl, cancelUrl } = body;

    // Validate tier
    if (!tier || !['pro', 'enterprise'].includes(tier)) {
      return authError('Invalid subscription tier', 400);
    }

    const priceId = PRICE_IDS[tier as keyof typeof PRICE_IDS];

    // Initialize Stripe
    const stripe = new Stripe(stripeKey);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/app?payment=success`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/pricing?payment=cancelled`,
      customer_email: auth.user?.email,
      client_reference_id: auth.user?.id,
      metadata: {
        userId: auth.user?.id || '',
        tier: tier
      },
      subscription_data: {
        metadata: {
          userId: auth.user?.id || '',
          tier: tier
        }
      }
    });

    return new Response(JSON.stringify({
      sessionId: session.id,
      url: session.url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return authError('Failed to create checkout session', 500);
  }
}
