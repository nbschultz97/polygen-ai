/**
 * Stripe Customer Portal API
 * Creates a portal session for managing subscriptions
 */

import Stripe from 'stripe';
import { verifyAuth, authError } from '../lib/auth';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
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

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return authError('Payment system not configured', 500);
  }

  try {
    const body = await req.json();
    const { customerId, returnUrl } = body;

    if (!customerId) {
      return authError('Customer ID required', 400);
    }

    const stripe = new Stripe(stripeKey);

    const origin = req.headers.get('origin') || '';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || origin + '/app'
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Portal error:', error);
    return authError('Failed to create portal session', 500);
  }
}
