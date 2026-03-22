/**
 * Stripe Service Unit Tests
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  STRIPE_PRICES,
  PRICING_PLANS,
  createCheckoutSession,
  getSubscriptionStatus,
} from '../../services/stripeService';

// Mock apiClient
vi.mock('../../services/apiClient', () => ({
  getAuthToken: vi.fn().mockResolvedValue('mock-token'),
}));

describe('Stripe Service', () => {
  describe('STRIPE_PRICES', () => {
    it('has all required price IDs', () => {
      expect(STRIPE_PRICES).toHaveProperty('pro_monthly');
      expect(STRIPE_PRICES).toHaveProperty('pro_yearly');
      expect(STRIPE_PRICES).toHaveProperty('enterprise_monthly');
      expect(STRIPE_PRICES).toHaveProperty('enterprise_yearly');
    });

    it('price IDs are non-empty strings', () => {
      Object.values(STRIPE_PRICES).forEach((id) => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PRICING_PLANS', () => {
    it('has 3 tiers: free, pro, enterprise', () => {
      expect(PRICING_PLANS).toHaveLength(3);
      const ids = PRICING_PLANS.map((p) => p.id);
      expect(ids).toEqual(['free', 'pro', 'enterprise']);
    });

    it('free plan has $0 pricing', () => {
      const free = PRICING_PLANS.find((p) => p.id === 'free')!;
      expect(free.monthlyPrice).toBe(0);
      expect(free.yearlyPrice).toBe(0);
    });

    it('pro plan is highlighted', () => {
      const pro = PRICING_PLANS.find((p) => p.id === 'pro')!;
      expect(pro.highlighted).toBe(true);
    });

    it('every plan has features array', () => {
      PRICING_PLANS.forEach((plan) => {
        expect(Array.isArray(plan.features)).toBe(true);
        expect(plan.features.length).toBeGreaterThan(0);
      });
    });

    it('yearly prices are less than 12x monthly', () => {
      PRICING_PLANS.filter((p) => p.monthlyPrice > 0).forEach((plan) => {
        expect(plan.yearlyPrice).toBeLessThanOrEqual(plan.monthlyPrice * 12);
      });
    });

    it('enterprise is more expensive than pro', () => {
      const pro = PRICING_PLANS.find((p) => p.id === 'pro')!;
      const ent = PRICING_PLANS.find((p) => p.id === 'enterprise')!;
      expect(ent.monthlyPrice).toBeGreaterThan(pro.monthlyPrice);
    });
  });

  describe('createCheckoutSession', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.mock('../../services/apiClient', () => ({
        getAuthToken: vi.fn().mockResolvedValue('mock-token'),
      }));
    });

    it('returns error when not authenticated', async () => {
      const { getAuthToken } = await import('../../services/apiClient');
      vi.mocked(getAuthToken).mockResolvedValueOnce(null);

      const result = await createCheckoutSession('pro');
      expect(result.url).toBeNull();
      expect(result.error).toContain('log in');
    });

    it('calls /api/stripe/checkout with correct payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'https://checkout.stripe.com/test' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await createCheckoutSession('pro');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/stripe/checkout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
      expect(result.url).toBe('https://checkout.stripe.com/test');
      expect(result.error).toBeNull();
    });

    it('handles API error response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Stripe unavailable' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await createCheckoutSession('enterprise');
      expect(result.url).toBeNull();
      expect(result.error).toBe('Stripe unavailable');
    });

    it('handles network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await createCheckoutSession('pro');
      expect(result.url).toBeNull();
      expect(result.error).toContain('Failed');
    });
  });

  describe('getSubscriptionStatus', () => {
    it('returns status and period end on success', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'active', currentPeriodEnd: 1700000000 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await getSubscriptionStatus('sub_123');
      expect(result.status).toBe('active');
      expect(result.currentPeriodEnd).toBeInstanceOf(Date);
      expect(result.error).toBeNull();
    });

    it('returns inactive on API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await getSubscriptionStatus('sub_invalid');
      expect(result.status).toBe('inactive');
      expect(result.error).toBe('Not found');
    });

    it('handles null currentPeriodEnd', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'trialing', currentPeriodEnd: null }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await getSubscriptionStatus('sub_trial');
      expect(result.currentPeriodEnd).toBeNull();
    });
  });
});
