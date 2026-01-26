/**
 * Pricing Page Component
 * Displays pricing tiers with Stripe checkout integration
 */

import React, { useState } from 'react';
import { Check, Sparkles, Zap, Building2, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { PRICING_PLANS, redirectToCheckout, redirectToPortal } from '../services/stripeService';
import AuthModal from './AuthModal';

interface PricingPageProps {
  onClose?: () => void;
}

export default function PricingPage({ onClose }: PricingPageProps) {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const { user, profile } = useAuth();

  const handleSubscribe = async (plan: typeof PRICING_PLANS[0]) => {
    if (plan.id === 'free') return;

    if (!user) {
      setShowAuth(true);
      return;
    }

    setLoading(plan.id);

    try {
      const priceId = billingInterval === 'monthly' ? plan.priceIdMonthly : plan.priceIdYearly;
      await redirectToCheckout(priceId, user.id, user.email!);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!profile?.stripeCustomerId) return;

    setLoading('manage');
    try {
      await redirectToPortal(profile.stripeCustomerId);
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open subscription management. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Sparkles className="w-6 h-6" />;
      case 'pro':
        return <Zap className="w-6 h-6" />;
      case 'enterprise':
        return <Building2 className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Start free and upgrade when you need more. No hidden fees, cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center bg-white/[0.04] rounded-xl p-1 border border-white/[0.08]">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingInterval === 'monthly'
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingInterval === 'yearly'
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => {
            const price = billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice / 12;
            const isCurrentPlan = profile?.tier === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border ${
                  plan.highlighted
                    ? 'border-violet-500/50 bg-violet-500/5'
                    : 'border-white/[0.08] bg-white/[0.02]'
                } p-6 flex flex-col`}
              >
                {/* Popular Badge */}
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-violet-600 text-white text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    plan.highlighted
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'bg-white/[0.06] text-gray-400'
                  }`}>
                    {getIcon(plan.id)}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      ${price.toFixed(0)}
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-gray-500">/month</span>
                    )}
                  </div>
                  {billingInterval === 'yearly' && plan.yearlyPrice > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      ${plan.yearlyPrice} billed annually
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 mt-0.5 ${
                        plan.highlighted ? 'text-violet-400' : 'text-emerald-400'
                      }`} />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <button
                    onClick={handleManageSubscription}
                    disabled={loading === 'manage' || plan.id === 'free'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.06] text-white font-medium rounded-xl border border-white/[0.1] hover:bg-white/[0.1] transition-colors disabled:opacity-50"
                  >
                    {loading === 'manage' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {plan.id === 'free' ? 'Current Plan' : 'Manage Subscription'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading === plan.id}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
                      plan.highlighted
                        ? 'bg-violet-600 hover:bg-violet-500 text-white'
                        : plan.id === 'free'
                          ? 'bg-white/[0.06] text-white border border-white/[0.1] hover:bg-white/[0.1]'
                          : 'bg-white/[0.06] text-white border border-white/[0.1] hover:bg-white/[0.1]'
                    }`}
                  >
                    {loading === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    {plan.id === 'free' ? 'Get Started' : 'Subscribe'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ / Trust Signals */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            All plans include SSL encryption, GDPR compliance, and 99.9% uptime SLA.
            <br />
            Questions? Email us at <a href="mailto:support@polygenai.com" className="text-violet-400 hover:underline">support@polygenai.com</a>
          </p>
        </div>

        {/* Close Button */}
        {onClose && (
          <div className="mt-8 text-center">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white text-sm"
            >
              Back to app
            </button>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        defaultMode="signup"
      />
    </div>
  );
}
