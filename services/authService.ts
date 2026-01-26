/**
 * Authentication Service
 * Uses Supabase Auth for user management
 */

import { createClient, User, Session, AuthError } from '@supabase/supabase-js';

// Initialize Supabase client
// Support both Vite (VITE_) and Vercel integration (NEXT_PUBLIC_) variable names
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ||
                    import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ||
                        import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== '' && supabaseAnonKey !== '' &&
  supabaseUrl.includes('supabase');

// Create a mock client that returns null/empty for all operations when not configured
const mockSupabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Auth not configured' } }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Auth not configured' } }),
    signInWithOAuth: async () => ({ error: { message: 'Auth not configured' } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    insert: async () => ({ error: { message: 'Database not configured' } }),
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: { message: 'Database not configured' } })
      })
    }),
    update: () => ({
      eq: async () => ({ error: { message: 'Database not configured' } })
    })
  }),
  rpc: async () => ({ error: { message: 'Database not configured' } })
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockSupabase as any;

export interface UserProfile {
  id: string;
  email: string;
  tier: 'free' | 'pro' | 'enterprise';
  generationsUsed: number;
  generationsLimit: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
}

// Tier limits
export const TIER_LIMITS = {
  free: {
    generationsPerMonth: 5,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    features: ['basic-templates', 'code-export']
  },
  pro: {
    generationsPerMonth: 100,
    maxFileSize: 20 * 1024 * 1024, // 20MB
    features: ['all-templates', 'code-export', '3d-preview', 'stl-export', 'priority-support']
  },
  enterprise: {
    generationsPerMonth: -1, // unlimited
    maxFileSize: 50 * 1024 * 1024, // 50MB
    features: ['all-templates', 'code-export', '3d-preview', 'stl-export', 'priority-support', 'api-access', 'team-management']
  }
};

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (data.user && !error) {
    // Create user profile with free tier
    await createUserProfile(data.user.id, email);
  }

  return { user: data.user, error };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  return { user: data.user, error };
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });

  return { error };
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Create user profile in database
 */
async function createUserProfile(userId: string, email: string): Promise<void> {
  const { error } = await supabase.from('user_profiles').insert({
    id: userId,
    email,
    tier: 'free',
    generations_used: 0,
    generations_limit: TIER_LIMITS.free.generationsPerMonth,
    created_at: new Date().toISOString()
  });

  if (error) {
    console.error('Failed to create user profile:', error);
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    tier: data.tier,
    generationsUsed: data.generations_used,
    generationsLimit: data.generations_limit,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    createdAt: data.created_at
  };
}

/**
 * Check if user can generate (has remaining generations)
 */
export async function canGenerate(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const profile = await getUserProfile(userId);

  if (!profile) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  // Unlimited for enterprise
  if (profile.generationsLimit === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const remaining = profile.generationsLimit - profile.generationsUsed;
  return {
    allowed: remaining > 0,
    remaining,
    limit: profile.generationsLimit
  };
}

/**
 * Increment generation count
 */
export async function incrementGenerationCount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_generations', { user_id: userId });

  if (error) {
    console.error('Failed to increment generation count:', error);
  }
}

/**
 * Update user tier (called by Stripe webhook)
 */
export async function updateUserTier(
  userId: string,
  tier: 'free' | 'pro' | 'enterprise',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      tier,
      generations_limit: TIER_LIMITS[tier].generationsPerMonth,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update user tier:', error);
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}

export const authService = {
  supabase,
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  getSession,
  getCurrentUser,
  getUserProfile,
  canGenerate,
  incrementGenerationCount,
  updateUserTier,
  onAuthStateChange,
  TIER_LIMITS
};

export default authService;
