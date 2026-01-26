/**
 * Stripe Service
 * Handles subscription payments and checkout
 */

import { getAuthToken } from './apiClient';

// Price IDs from Stripe dashboard
export const STRIPE_PRICES = {
  pro_monthly: 'price_1StvSH2F3wOoNwibyk0SrBei',
  pro_yearly: 'price_1StvSH2F3wOoNwibyk0SrBei', // TODO: Create yearly price in Stripe
  enterprise_monthly: 'price_1StvSa2F3wOoNwibbsM0WOac',
  enterprise_yearly: 'price_1StvSa2F3wOoNwibbsM0WOac' // TODO: Create yearly price in Stripe
};

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  highlighted?: boolean;
  priceIdMonthly: string;
  priceIdYearly: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out PolyGen AI',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '5 generations per month',
      'Basic design templates',
      'OpenSCAD code export',
      'Community support'
    ],
    priceIdMonthly: '',
    priceIdYearly: ''
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For makers and hobbyists',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    features: [
      '100 generations per month',
      'All design templates',
      'OpenSCAD code export',
      '3D preview in browser',
      'Direct STL export',
      'Priority support',
      'Image-to-3D conversion'
    ],
    highlighted: true,
    priceIdMonthly: STRIPE_PRICES.pro_monthly,
    priceIdYearly: STRIPE_PRICES.pro_yearly
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For teams and businesses',
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
    features: [
      'Unlimited generations',
      'All Pro features',
      'API access',
      'Team management',
      'Custom templates',
      'Dedicated support',
      'White-label options'
    ],
    priceIdMonthly: STRIPE_PRICES.enterprise_monthly,
    priceIdYearly: STRIPE_PRICES.enterprise_yearly
  }
];

/**
 * Create Stripe Checkout session
 */
export async function createCheckoutSession(
  tier: 'pro' | 'enterprise',
  successUrl?: string,
  cancelUrl?: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { url: null, error: 'Please log in to subscribe' };
    }

    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        tier,
        successUrl: successUrl || `${window.location.origin}/app?payment=success`,
        cancelUrl: cancelUrl || `${window.location.origin}/pricing?payment=cancelled`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { url: null, error: data.error || 'Failed to create checkout session' };
    }

    return { url: data.url, error: null };
  } catch (error) {
    console.error('Checkout error:', error);
    return { url: null, error: 'Failed to create checkout session' };
  }
}

/**
 * Create Stripe Customer Portal session (for managing subscription)
 */
export async function createPortalSession(
  customerId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { url: null, error: 'Please log in to manage subscription' };
    }

    const response = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerId,
        returnUrl: `${window.location.origin}/app`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { url: null, error: data.error || 'Failed to create portal session' };
    }

    return { url: data.url, error: null };
  } catch (error) {
    console.error('Portal error:', error);
    return { url: null, error: 'Failed to create portal session' };
  }
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(
  subscriptionId: string
): Promise<{ status: string; currentPeriodEnd: Date | null; error: string | null }> {
  try {
    const response = await fetch(`/api/stripe/subscription/${subscriptionId}`);
    const data = await response.json();

    if (!response.ok) {
      return { status: 'inactive', currentPeriodEnd: null, error: data.error };
    }

    return {
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd * 1000) : null,
      error: null
    };
  } catch (error) {
    console.error('Subscription status error:', error);
    return { status: 'inactive', currentPeriodEnd: null, error: 'Failed to get subscription status' };
  }
}

/**
 * Redirect to checkout
 */
export async function redirectToCheckout(tier: 'pro' | 'enterprise'): Promise<void> {
  const { url, error } = await createCheckoutSession(tier);

  if (error) {
    throw new Error(error);
  }

  if (url) {
    window.location.href = url;
  }
}

/**
 * Redirect to customer portal
 */
export async function redirectToPortal(customerId: string): Promise<void> {
  const { url, error } = await createPortalSession(customerId);

  if (error) {
    throw new Error(error);
  }

  if (url) {
    window.location.href = url;
  }
}

export const stripeService = {
  PRICING_PLANS,
  STRIPE_PRICES,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  redirectToCheckout,
  redirectToPortal
};

export default stripeService;
