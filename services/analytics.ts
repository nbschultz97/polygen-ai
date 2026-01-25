/**
 * Analytics Service
 * Google Analytics 4 integration for tracking user events
 */

// GA4 Measurement ID - replace with your actual ID
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

// Initialize GA4
export function initializeAnalytics() {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    send_page_view: true
  });
}

// Track page view
export function trackPageView(pagePath: string, pageTitle?: string) {
  if (!window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle
  });
}

// Track custom events
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
) {
  if (!window.gtag) return;
  window.gtag('event', eventName, eventParams);
}

// Common event trackers
export const analytics = {
  // User authentication events
  signUp: (method: string) => trackEvent('sign_up', { method }),
  login: (method: string) => trackEvent('login', { method }),
  logout: () => trackEvent('logout'),

  // Generation events
  startGeneration: (promptLength: number, hasImage: boolean) =>
    trackEvent('start_generation', {
      prompt_length: promptLength,
      has_image: hasImage
    }),
  completeGeneration: (duration: number, success: boolean) =>
    trackEvent('complete_generation', {
      duration_ms: duration,
      success
    }),
  exportModel: (format: 'scad' | 'stl') =>
    trackEvent('export_model', { format }),

  // Template events
  selectTemplate: (templateId: string) =>
    trackEvent('select_template', { template_id: templateId }),

  // Subscription events
  viewPricing: () => trackEvent('view_pricing'),
  startCheckout: (plan: string, isAnnual: boolean) =>
    trackEvent('begin_checkout', {
      plan,
      billing_period: isAnnual ? 'annual' : 'monthly'
    }),
  completeCheckout: (plan: string, value: number) =>
    trackEvent('purchase', {
      plan,
      value,
      currency: 'USD'
    }),

  // Feature usage
  useFeature: (featureName: string) =>
    trackEvent('use_feature', { feature: featureName }),

  // Referral events
  shareReferral: (method: string) =>
    trackEvent('share_referral', { method }),
  clickReferralLink: (referralCode: string) =>
    trackEvent('referral_click', { code: referralCode }),

  // Error tracking
  trackError: (errorType: string, errorMessage: string) =>
    trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage
    })
};

// Declare global types
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
