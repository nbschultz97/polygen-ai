/**
 * App Router Component
 * Handles routing between landing page, app, pricing, and legal pages
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import LandingPage from './LandingPage';
import PricingPage from './PricingPage';
import MainApp from './MainApp';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import AnalyticsDashboard from './AnalyticsDashboard';

type View = 'landing' | 'app' | 'pricing' | 'privacy' | 'terms' | 'dashboard';

export default function AppRouter() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('landing');

  // Check URL path and params for routing
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path === '/privacy') {
      setView('privacy');
    } else if (path === '/terms') {
      setView('terms');
    } else if (path === '/dashboard') {
      setView('dashboard');
    } else if (params.get('success') === 'true') {
      setView('app');
    } else if (params.get('pricing') === 'true' || path === '/pricing') {
      setView('pricing');
    } else if (path === '/app') {
      setView('app');
    }
  }, []);

  // Auto-redirect logged-in users to app
  useEffect(() => {
    if (user && view === 'landing') {
      // Check if they came from a specific route
      const params = new URLSearchParams(window.location.search);
      if (!params.get('home')) {
        setView('app');
      }
    }
  }, [user, view]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle navigation
  const handleStartApp = () => {
    setView('app');
    window.history.pushState({}, '', '/app');
  };

  const handleShowPricing = () => {
    setView('pricing');
    window.history.pushState({}, '', '/pricing');
  };

  const handleShowLanding = () => {
    setView('landing');
    window.history.pushState({}, '', '/?home=true');
  };

  const handleClosePricing = () => {
    if (user) {
      setView('app');
      window.history.pushState({}, '', '/app');
    } else {
      setView('landing');
      window.history.pushState({}, '', '/');
    }
  };

  const handleShowPrivacy = () => {
    setView('privacy');
    window.history.pushState({}, '', '/privacy');
  };

  const handleShowTerms = () => {
    setView('terms');
    window.history.pushState({}, '', '/terms');
  };

  const handleShowDashboard = () => {
    setView('dashboard');
    window.history.pushState({}, '', '/dashboard');
  };

  const handleBackFromLegal = () => {
    setView('landing');
    window.history.pushState({}, '', '/');
  };

  // Render based on view
  switch (view) {
    case 'pricing':
      return <PricingPage onClose={handleClosePricing} />;

    case 'privacy':
      return <PrivacyPolicy onBack={handleBackFromLegal} />;

    case 'terms':
      return <TermsOfService onBack={handleBackFromLegal} />;

    case 'dashboard':
      return user ? (
        <AnalyticsDashboard />
      ) : (
        <LandingPage
          onStartApp={handleStartApp}
          onShowPricing={handleShowPricing}
          onShowPrivacy={handleShowPrivacy}
          onShowTerms={handleShowTerms}
        />
      );

    case 'app':
      return (
        <MainApp
          onShowPricing={handleShowPricing}
          onShowLanding={handleShowLanding}
          onShowDashboard={handleShowDashboard}
        />
      );

    case 'landing':
    default:
      return (
        <LandingPage
          onStartApp={handleStartApp}
          onShowPricing={handleShowPricing}
          onShowPrivacy={handleShowPrivacy}
          onShowTerms={handleShowTerms}
        />
      );
  }
}
