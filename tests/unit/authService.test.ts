/**
 * Auth Service Tests
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock supabase client creation
const mockAuth = {
  getSession: vi.fn(),
  getUser: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
};

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: mockAuth,
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

// Need to set env vars before import
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

import {
  signIn,
  signOut,
  getSession,
  getCurrentUser,
  getUserProfile,
  canGenerate,
  incrementGenerationCount,
  onAuthStateChange,
  TIER_LIMITS,
} from '../../services/authService';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TIER_LIMITS', () => {
    it('has correct free tier limits', () => {
      expect(TIER_LIMITS.free.generationsPerMonth).toBe(5);
    });
    it('has unlimited enterprise generations', () => {
      expect(TIER_LIMITS.enterprise.generationsPerMonth).toBe(-1);
    });
    it('pro tier has more features than free', () => {
      expect(TIER_LIMITS.pro.features.length).toBeGreaterThan(TIER_LIMITS.free.features.length);
    });
  });

  describe('signIn', () => {
    it('returns user on success', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '123', email: 'test@test.com' }, session: {} },
        error: null,
      });
      const { user, error } = await signIn('test@test.com', 'pass');
      expect(user?.id).toBe('123');
      expect(error).toBeNull();
    });

    it('returns error on failure', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });
      const { user, error } = await signIn('bad@test.com', 'wrong');
      expect(user).toBeNull();
      expect(error?.message).toBe('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });
      await signOut();
      expect(mockAuth.signOut).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('returns session', async () => {
      mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
      const session = await getSession();
      expect(session?.access_token).toBe('tok');
    });

    it('returns null when no session', async () => {
      mockAuth.getSession.mockResolvedValue({ data: { session: null } });
      expect(await getSession()).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('returns user', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      const user = await getCurrentUser();
      expect(user?.id).toBe('u1');
    });
  });

  describe('getUserProfile', () => {
    it('returns mapped profile', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                id: 'u1', email: 'a@b.com', tier: 'pro',
                generations_used: 5, generations_limit: 100,
                stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1',
                created_at: '2024-01-01',
              },
              error: null,
            }),
          }),
        }),
      });
      const profile = await getUserProfile('u1');
      expect(profile?.tier).toBe('pro');
      expect(profile?.generationsUsed).toBe(5);
      expect(profile?.stripeCustomerId).toBe('cus_1');
    });

    it('returns null on error', async () => {
      mockFrom.mockReturnValue({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }),
      });
      expect(await getUserProfile('bad')).toBeNull();
    });
  });

  describe('canGenerate', () => {
    it('returns allowed when remaining > 0', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'u1', email: 'a@b.com', tier: 'free', generations_used: 3, generations_limit: 5, created_at: '2024-01-01' },
              error: null,
            }),
          }),
        }),
      });
      const result = await canGenerate('u1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('returns not allowed when limit reached', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'u1', email: 'a@b.com', tier: 'free', generations_used: 5, generations_limit: 5, created_at: '2024-01-01' },
              error: null,
            }),
          }),
        }),
      });
      const result = await canGenerate('u1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('returns unlimited for enterprise', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'u1', email: 'a@b.com', tier: 'enterprise', generations_used: 999, generations_limit: -1, created_at: '2024-01-01' },
              error: null,
            }),
          }),
        }),
      });
      const result = await canGenerate('u1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
    });

    it('returns not allowed when no profile', async () => {
      mockFrom.mockReturnValue({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'nope' } }) }) }),
      });
      const result = await canGenerate('bad');
      expect(result.allowed).toBe(false);
    });
  });

  describe('incrementGenerationCount', () => {
    it('calls rpc', async () => {
      mockRpc.mockResolvedValue({ error: null });
      await incrementGenerationCount('u1');
      expect(mockRpc).toHaveBeenCalledWith('increment_generations', { user_id: 'u1' });
    });
  });

  describe('onAuthStateChange', () => {
    it('subscribes and returns unsubscribe fn', () => {
      const unsub = vi.fn();
      mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: unsub } } });
      const cb = vi.fn();
      const unsubscribe = onAuthStateChange(cb);
      unsubscribe();
      expect(unsub).toHaveBeenCalled();
    });
  });
});
