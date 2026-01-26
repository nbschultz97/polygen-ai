/**
 * Shared authentication utilities for API routes
 * Handles JWT verification, usage limits, and rate limiting
 */

import { createClient } from '@supabase/supabase-js';

// Rate limiting map (in-memory for edge functions)
// Note: This resets on cold starts, but provides basic protection
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per IP

interface AuthResult {
  success: boolean;
  error?: string;
  status?: number;
  user?: {
    id: string;
    email: string;
  };
  profile?: {
    id: string;
    tier: string;
    generations_used: number;
    generations_limit: number;
  };
}

/**
 * Get Supabase client for server-side operations
 */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Check rate limit for an IP address
 */
export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = ip || 'unknown';

  let record = rateLimitMap.get(key);

  // Clean up old entry or create new one
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(key, record);
  }

  record.count++;

  // Clean up old entries periodically (prevent memory leak)
  if (rateLimitMap.size > 10000) {
    const cutoff = now - RATE_LIMIT_WINDOW;
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < cutoff) {
        rateLimitMap.delete(k);
      }
    }
  }

  return {
    allowed: record.count <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count)
  };
}

/**
 * Verify authentication and check usage limits
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  // Get client IP for rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') ||
             'unknown';

  // Check rate limit first
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded. Please wait a minute before trying again.',
      status: 429
    };
  }

  // Get auth token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Authentication required. Please log in.',
      status: 401
    };
  }

  const token = authHeader.replace('Bearer ', '');

  // Get Supabase admin client
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    // If Supabase isn't configured, allow request but log warning
    console.warn('Supabase not configured - auth check skipped');
    return { success: true };
  }

  try {
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        success: false,
        error: 'Invalid or expired token. Please log in again.',
        status: 401
      };
    }

    // Get user profile with usage limits
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tier, generations_used, generations_limit')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Create profile if it doesn't exist (new user)
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          tier: 'free',
          generations_used: 0,
          generations_limit: 5 // Free tier: 5 generations
        })
        .select()
        .single();

      if (createError || !newProfile) {
        return {
          success: false,
          error: 'Failed to create user profile',
          status: 500
        };
      }

      return {
        success: true,
        user: { id: user.id, email: user.email || '' },
        profile: newProfile
      };
    }

    // Check usage limits (-1 means unlimited)
    if (profile.generations_limit !== -1 &&
        profile.generations_used >= profile.generations_limit) {
      return {
        success: false,
        error: `Usage limit reached (${profile.generations_used}/${profile.generations_limit}). Please upgrade your plan.`,
        status: 429
      };
    }

    return {
      success: true,
      user: { id: user.id, email: user.email || '' },
      profile
    };

  } catch (error) {
    console.error('Auth verification error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      status: 500
    };
  }
}

/**
 * Increment usage counter after successful generation
 */
export async function incrementUsage(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return true; // Skip if not configured

  try {
    // Use the increment_generations function defined in schema
    const { error } = await supabase.rpc('increment_generations', {
      user_id: userId
    });

    if (error) {
      console.error('Failed to increment usage via RPC:', error);
      // Fallback: try direct SQL update
      const { data, error: selectError } = await supabase
        .from('user_profiles')
        .select('generations_used')
        .eq('id', userId)
        .single();

      if (!selectError && data) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            generations_used: data.generations_used + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Failed to increment usage via update:', updateError);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Increment usage error:', error);
    return false;
  }
}

/**
 * Create error response
 */
export function authError(message: string, status: number = 401): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    }
  );
}
