/**
 * Stripe Service
 * Handles subscription payments and checkout
 */

// Price IDs - these will be set in your Stripe dashboard
export const STRIPE_PRICES = {
  pro_monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  pro_yearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
  enterprise_monthly: import.meta.env.VITE_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
  enterprise_yearly: import.meta.env.VITE_STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly'
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
    monthlyPrice: 19,
    yearlyPrice: 190,
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
    monthlyPrice: 99,
    yearlyPrice: 990,
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
  priceId: string,
  userId: string,
  customerEmail: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priceId,
        userId,
        customerEmail,
        successUrl: successUrl || `${window.location.origin}/dashboard?success=true`,
        cancelUrl: cancelUrl || `${window.location.origin}/pricing?canceled=true`
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
    const response = await fetch('/api/stripe/create-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerId,
        returnUrl: `${window.location.origin}/dashboard`
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
export async function redirectToCheckout(
  priceId: string,
  userId: string,
  customerEmail: string
): Promise<void> {
  const { url, error } = await createCheckoutSession(priceId, userId, customerEmail);

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
