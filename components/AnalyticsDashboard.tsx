/**
 * Analytics Dashboard Component
 * Shows user stats, usage, and subscription info
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Zap,
  Crown,
  Settings,
  CreditCard,
  ArrowRight,
  Box,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/authService';
import { redirectToPortal, getSubscriptionStatus } from '../services/stripeService';
import ReferralSystem from './ReferralSystem';

interface GenerationStat {
  date: string;
  count: number;
}

export default function AnalyticsDashboard() {
  const { user, profile } = useAuth();
  const [recentGenerations, setRecentGenerations] = useState<GenerationStat[]>([]);
  const [totalGenerations, setTotalGenerations] = useState(0);
  const [subscriptionEnd, setSubscriptionEnd] = useState<Date | null>(null);
  const [, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Load generation history
        const { data: generations } = await supabase
          .from('generation_history')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (generations) {
          setTotalGenerations(generations.length);

          // Group by date for chart
          const byDate = generations.reduce((acc: Record<string, number>, g) => {
            const date = new Date(g.created_at).toLocaleDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {});

          const stats = Object.entries(byDate)
            .map(([date, count]) => ({ date, count: count as number }))
            .slice(0, 7)
            .reverse();

          setRecentGenerations(stats);
        }

        // Get subscription end date
        if (profile?.stripeSubscriptionId) {
          const { currentPeriodEnd } = await getSubscriptionStatus(profile.stripeSubscriptionId);
          setSubscriptionEnd(currentPeriodEnd);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user, profile]);

  const handleManageSubscription = async () => {
    if (!profile?.stripeCustomerId) return;
    await redirectToPortal(profile.stripeCustomerId);
  };

  if (!user || !profile) {
    return null;
  }

  const usagePercent =
    profile.generationsLimit > 0 ? (profile.generationsUsed / profile.generationsLimit) * 100 : 0;

  const tierColors = {
    free: 'text-gray-400',
    pro: 'text-violet-400',
    enterprise: 'text-amber-400',
  };

  const tierBadgeColors = {
    free: 'bg-gray-500/10 border-gray-500/20',
    pro: 'bg-violet-500/10 border-violet-500/20',
    enterprise: 'bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Monitor your usage and manage your subscription</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {/* Current Plan */}
          <div className="p-5 bg-white/[0.02] border border-white/[0.08] rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${tierBadgeColors[profile.tier]}`}>
                {profile.tier === 'enterprise' ? (
                  <Crown className={`w-5 h-5 ${tierColors[profile.tier]}`} />
                ) : (
                  <Zap className={`w-5 h-5 ${tierColors[profile.tier]}`} />
                )}
              </div>
              <span className="text-sm text-gray-400">Current Plan</span>
            </div>
            <div className={`text-2xl font-bold capitalize ${tierColors[profile.tier]}`}>
              {profile.tier}
            </div>
          </div>

          {/* Usage This Month */}
          <div className="p-5 bg-white/[0.02] border border-white/[0.08] rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm text-gray-400">This Month</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {profile.generationsUsed}
              <span className="text-sm font-normal text-gray-500">
                {profile.generationsLimit === -1 ? ' / ∞' : ` / ${profile.generationsLimit}`}
              </span>
            </div>
          </div>

          {/* Total Generations */}
          <div className="p-5 bg-white/[0.02] border border-white/[0.08] rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Box className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Total Models</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalGenerations}</div>
          </div>

          {/* Renewal Date */}
          <div className="p-5 bg-white/[0.02] border border-white/[0.08] rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">Resets On</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {subscriptionEnd
                ? subscriptionEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '1st'}
            </div>
          </div>
        </div>

        {/* Usage Progress */}
        {profile.generationsLimit > 0 && (
          <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-xl mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Monthly Usage</h3>
              <span className="text-sm text-gray-400">
                {profile.generationsLimit - profile.generationsUsed} remaining
              </span>
            </div>
            <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent > 90
                    ? 'bg-red-500'
                    : usagePercent > 70
                      ? 'bg-amber-500'
                      : 'bg-violet-500'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            {usagePercent > 80 && profile.tier === 'free' && (
              <p className="mt-3 text-sm text-amber-400">
                You're running low on generations. Upgrade to Pro for 100/month.
              </p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-xl">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              Recent Activity
            </h3>
            {recentGenerations.length > 0 ? (
              <div className="space-y-3">
                {recentGenerations.map((stat, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 text-xs text-gray-500">{stat.date}</div>
                    <div className="flex-1 h-6 bg-white/[0.04] rounded overflow-hidden">
                      <div
                        className="h-full bg-violet-500/40 rounded"
                        style={{
                          width: `${(stat.count / Math.max(...recentGenerations.map((s) => s.count))) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="w-8 text-sm text-gray-400 text-right">{stat.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No generations yet. Create your first model!</p>
            )}
          </div>

          {/* Subscription Management */}
          <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-xl">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Subscription
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                <div>
                  <div className="text-sm text-gray-400">Plan</div>
                  <div className={`font-medium capitalize ${tierColors[profile.tier]}`}>
                    {profile.tier}
                  </div>
                </div>
                {profile.tier !== 'free' && profile.stripeCustomerId && (
                  <button
                    onClick={handleManageSubscription}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Manage
                  </button>
                )}
              </div>

              {profile.tier === 'free' && (
                <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-violet-400" />
                    <span className="font-medium text-white">Upgrade to Pro</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    Get 100 generations/month, 3D preview, STL export, and priority support.
                  </p>
                  <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
                    Upgrade Now
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Referral System */}
        <div className="mt-8">
          <ReferralSystem />
        </div>
      </div>
    </div>
  );
}
