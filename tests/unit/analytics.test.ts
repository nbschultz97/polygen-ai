/**
 * Analytics Service Unit Tests
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { analytics, trackEvent, trackPageView, initializeAnalytics } from '../../services/analytics';

describe('Analytics Service', () => {
  beforeEach(() => {
    // Mock window.gtag
    (globalThis as any).window = {
      gtag: vi.fn(),
      dataLayer: [],
      location: { pathname: '/test' },
      document: undefined,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('trackEvent', () => {
    it('calls gtag with event name and params', () => {
      trackEvent('test_event', { key: 'value' });
      expect(window.gtag).toHaveBeenCalledWith('event', 'test_event', { key: 'value' });
    });

    it('does nothing when gtag is not available', () => {
      (window as any).gtag = undefined;
      // Should not throw
      expect(() => trackEvent('test_event')).not.toThrow();
    });
  });

  describe('trackPageView', () => {
    it('tracks page view with path and title', () => {
      trackPageView('/home', 'Home Page');
      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/home',
        page_title: 'Home Page',
      });
    });

    it('tracks page view without title', () => {
      trackPageView('/about');
      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/about',
        page_title: undefined,
      });
    });
  });

  describe('analytics helpers', () => {
    it('tracks sign up', () => {
      analytics.signUp('google');
      expect(window.gtag).toHaveBeenCalledWith('event', 'sign_up', { method: 'google' });
    });

    it('tracks login', () => {
      analytics.login('email');
      expect(window.gtag).toHaveBeenCalledWith('event', 'login', { method: 'email' });
    });

    it('tracks logout', () => {
      analytics.logout();
      expect(window.gtag).toHaveBeenCalledWith('event', 'logout', undefined);
    });

    it('tracks start generation', () => {
      analytics.startGeneration(150, true);
      expect(window.gtag).toHaveBeenCalledWith('event', 'start_generation', {
        prompt_length: 150,
        has_image: true,
      });
    });

    it('tracks complete generation', () => {
      analytics.completeGeneration(5000, true);
      expect(window.gtag).toHaveBeenCalledWith('event', 'complete_generation', {
        duration_ms: 5000,
        success: true,
      });
    });

    it('tracks export model', () => {
      analytics.exportModel('stl');
      expect(window.gtag).toHaveBeenCalledWith('event', 'export_model', { format: 'stl' });
    });

    it('tracks template selection', () => {
      analytics.selectTemplate('gear-box');
      expect(window.gtag).toHaveBeenCalledWith('event', 'select_template', {
        template_id: 'gear-box',
      });
    });

    it('tracks checkout flow', () => {
      analytics.viewPricing();
      expect(window.gtag).toHaveBeenCalledWith('event', 'view_pricing', undefined);

      analytics.startCheckout('pro', true);
      expect(window.gtag).toHaveBeenCalledWith('event', 'begin_checkout', {
        plan: 'pro',
        billing_period: 'annual',
      });

      analytics.startCheckout('basic', false);
      expect(window.gtag).toHaveBeenCalledWith('event', 'begin_checkout', {
        plan: 'basic',
        billing_period: 'monthly',
      });
    });

    it('tracks errors', () => {
      analytics.trackError('network', 'Connection failed');
      expect(window.gtag).toHaveBeenCalledWith('event', 'error', {
        error_type: 'network',
        error_message: 'Connection failed',
      });
    });

    it('tracks feature usage', () => {
      analytics.useFeature('dark-mode');
      expect(window.gtag).toHaveBeenCalledWith('event', 'use_feature', { feature: 'dark-mode' });
    });

    it('tracks referral events', () => {
      analytics.shareReferral('twitter');
      expect(window.gtag).toHaveBeenCalledWith('event', 'share_referral', { method: 'twitter' });

      analytics.clickReferralLink('ABC123');
      expect(window.gtag).toHaveBeenCalledWith('event', 'referral_click', { code: 'ABC123' });
    });
  });
});
