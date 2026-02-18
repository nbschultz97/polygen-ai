/**
 * Usage Limit Modal Component
 * Shows when user has reached their generation limit
 */

import React from 'react';
import { AlertTriangle, ArrowRight, X, Zap } from 'lucide-react';
interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  remaining: number;
  limit: number;
}

export default function UsageLimitModal({
  isOpen,
  onClose,
  onUpgrade,
  remaining,
  limit,
}: UsageLimitModalProps) {
  if (!isOpen) return null;

  const isAtLimit = remaining <= 0;
  const isNearLimit = remaining > 0 && remaining <= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#0c0c0f] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`p-6 ${isAtLimit ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
              isAtLimit ? 'bg-red-500/20' : 'bg-amber-500/20'
            }`}
          >
            <AlertTriangle className={`w-7 h-7 ${isAtLimit ? 'text-red-400' : 'text-amber-400'}`} />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">
            {isAtLimit ? 'Generation Limit Reached' : 'Running Low on Generations'}
          </h2>

          <p className="text-gray-400 text-sm">
            {isAtLimit
              ? `You've used all ${limit} of your free generations this month.`
              : `You have ${remaining} generation${remaining !== 1 ? 's' : ''} remaining this month.`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Usage Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Monthly usage</span>
              <span className="text-white font-medium">
                {limit - remaining} / {limit}
              </span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-violet-500'
                }`}
                style={{ width: `${Math.min(((limit - remaining) / limit) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-medium">Upgrade to Pro</div>
                <div className="text-violet-400 text-sm">$19/month</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-300 mb-4">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-violet-400 rounded-full"></div>
                100 generations per month
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-violet-400 rounded-full"></div>
                3D preview in browser
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-violet-400 rounded-full"></div>
                Direct STL export
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-violet-400 rounded-full"></div>
                Priority support
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium rounded-xl border border-white/[0.1] transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={onUpgrade}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
            >
              Upgrade Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Reset Info */}
          <p className="mt-4 text-center text-xs text-gray-500">
            Free tier resets on the 1st of each month
          </p>
        </div>
      </div>
    </div>
  );
}
