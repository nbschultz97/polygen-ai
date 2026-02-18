/**
 * Referral System Component
 * Share referral links and track referrals
 */

import React, { useState, useEffect } from 'react';
import { Copy, Check, Gift, Users, Twitter, Linkedin, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/authService';

interface Referral {
  id: string;
  referred_email: string;
  status: 'pending' | 'signed_up' | 'subscribed' | 'rewarded';
  bonus_generations: number;
  created_at: string;
}

interface ReferralSystemProps {
  variant?: 'card' | 'inline' | 'modal';
}

export default function ReferralSystem({ variant = 'card' }: ReferralSystemProps) {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const [, setLoading] = useState(true);

  const referralUrl = referralCode ? `${window.location.origin}/?ref=${referralCode}` : '';

  useEffect(() => {
    const loadReferralData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Get or create referral code
        const { data: existingCode } = await supabase
          .from('referrals')
          .select('referral_code')
          .eq('referrer_id', user.id)
          .limit(1)
          .single();

        if (existingCode) {
          setReferralCode(existingCode.referral_code);
        } else {
          // Generate new code
          const code = user.id.substring(0, 8).toUpperCase();
          setReferralCode(code);
        }

        // Load referrals
        const { data: referralData } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false });

        if (referralData) {
          setReferrals(referralData);
        }
      } catch (error) {
        console.error('Error loading referral data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReferralData();
  }, [user]);

  const copyReferralLink = async () => {
    if (!referralUrl) return;

    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      `I've been using PolyGen AI to create 3D models from text - it's amazing! Try it out: ${referralUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(referralUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const shareByEmail = () => {
    const subject = encodeURIComponent('Check out PolyGen AI');
    const body = encodeURIComponent(
      `Hey!\n\nI've been using PolyGen AI to create 3D models from text descriptions. It's really cool!\n\nTry it out here: ${referralUrl}\n\nYou'll get 5 free generations to start.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const totalBonus = referrals.reduce((sum, r) => sum + (r.bonus_generations || 0), 0);
  const successfulReferrals = referrals.filter((r) => r.status === 'rewarded').length;

  if (!user) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
        <Gift className="w-5 h-5 text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">
            Refer friends, get 5 free generations each!
          </p>
        </div>
        <button
          onClick={copyReferralLink}
          className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-600 rounded-xl">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Refer & Earn</h3>
            <p className="text-sm text-gray-400">
              Get 5 free generations for each friend who signs up
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 divide-x divide-white/[0.06] border-b border-white/[0.06]">
        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-white">{successfulReferrals}</div>
          <div className="text-xs text-gray-500">Successful Referrals</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-violet-400">+{totalBonus}</div>
          <div className="text-xs text-gray-500">Bonus Generations</div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="p-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">Your referral link</label>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-gray-300 truncate">
            {referralUrl || 'Loading...'}
          </div>
          <button
            onClick={copyReferralLink}
            disabled={!referralUrl}
            className="flex items-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Share Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={shareOnTwitter}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm rounded-xl border border-white/[0.08] transition-colors"
          >
            <Twitter className="w-4 h-4" />
            Twitter
          </button>
          <button
            onClick={shareOnLinkedIn}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm rounded-xl border border-white/[0.08] transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </button>
          <button
            onClick={shareByEmail}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm rounded-xl border border-white/[0.08] transition-colors"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
        </div>
      </div>

      {/* Recent Referrals */}
      {referrals.length > 0 && (
        <div className="p-6 border-t border-white/[0.06]">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Recent Referrals
          </h4>
          <div className="space-y-2">
            {referrals.slice(0, 5).map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg"
              >
                <div className="text-sm text-gray-300 truncate">{referral.referred_email}</div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    referral.status === 'rewarded'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : referral.status === 'signed_up'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {referral.status === 'rewarded' && `+${referral.bonus_generations}`}
                  {referral.status === 'signed_up' && 'Signed up'}
                  {referral.status === 'pending' && 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
