/**
 * Email Capture Component
 * Waitlist signup and newsletter subscription
 */

import React, { useState } from 'react';
import { Mail, Loader2, Check, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../services/authService';

interface EmailCaptureProps {
  variant?: 'inline' | 'modal' | 'hero';
  title?: string;
  description?: string;
  buttonText?: string;
  source?: string;
}

export default function EmailCapture({
  variant = 'inline',
  title = 'Join the Waitlist',
  description = 'Be the first to know when new features launch.',
  buttonText = 'Join Waitlist',
  source = 'landing'
}: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Store in Supabase
      const { error: insertError } = await supabase
        .from('email_subscribers')
        .insert({
          email: email.toLowerCase().trim(),
          source,
          subscribed_at: new Date().toISOString()
        });

      if (insertError) {
        // Check if already subscribed
        if (insertError.code === '23505') {
          setSuccess(true);
          return;
        }
        throw insertError;
      }

      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      console.error('Email capture error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`flex items-center gap-3 ${
        variant === 'hero' ? 'justify-center' : ''
      }`}>
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">You're on the list!</span>
        </div>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className="w-full max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full px-5 py-4 pr-36 bg-white/[0.06] border border-white/[0.1] rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {buttonText}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-red-400 text-center">{error}</p>
        )}
        <p className="mt-3 text-xs text-gray-500 text-center">
          No spam, ever. Unsubscribe anytime.
        </p>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="p-6 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {buttonText}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }

  // Inline variant
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 flex-1">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            buttonText
          )}
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
