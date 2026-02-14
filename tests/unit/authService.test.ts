/**
 * Auth Service Tests
 * Since supabase isn't configured in test env, the module uses its internal mockSupabase.
 * We test the exported functions and constants.
 */
import { describe, expect, it, vi } from 'vitest';
import {
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
  TIER_LIMITS,
} from '../../services/authService';

describe('Auth Service', () => {
  describe('TIER_LIMITS', () => {
    it('has correct free tier limits', () => {
      expect(TIER_LIMITS.free.generationsPerMonth).toBe(5);
      expect(TIER_LIMITS.free.maxFileSize).toBe(5 * 1024 * 1024);
    });

    it('has correct pro tier limits', () => {
      expect(TIER_LIMITS.pro.generationsPerMonth).toBe(100);
      expect(TIER_LIMITS.pro.features).toContain('stl-export');
    });

    it('has unlimited enterprise generations', () => {
      expect(TIER_LIMITS.enterprise.generationsPerMonth).toBe(-1);
      expect(TIER_LIMITS.enterprise.features).toContain('api-access');
    });
  });

  describe('with mock supabase (not configured)', () => {
    it('signIn returns error', async () => {
      const { user, error } = await signIn('test@test.com', 'pass');
      expect(user).toBeNull();
      expect(error?.message).toBe('Auth not configured');
    });

    it('signOut completes', async () => {
      await expect(signOut()).resolves.not.toThrow();
    });

    it('getSession returns null', async () => {
      const session = await getSession();
      expect(session).toBeNull();
    });

    it('getCurrentUser returns null', async () => {
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('getUserProfile returns null', async () => {
      const profile = await getUserProfile('any-id');
      expect(profile).toBeNull();
    });

    it('canGenerate returns free tier defaults when no profile', async () => {
      const result = await canGenerate('any-id');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(result.limit).toBe(5);
    });

    it('incrementGenerationCount handles error gracefully', async () => {
      await expect(incrementGenerationCount('any-id')).resolves.not.toThrow();
    });

    it('signUp returns error when not configured', async () => {
      const { user, error } = await signUp('test@test.com', 'password123');
      expect(user).toBeNull();
      expect(error?.message).toBe('Auth not configured');
    });

    it('signInWithGoogle returns error when not configured', async () => {
      const { error } = await signInWithGoogle();
      expect(error?.message).toBe('Auth not configured');
    });

    it('updateUserTier does not throw', async () => {
      await expect(updateUserTier('any-id', 'pro', 'cus_123', 'sub_456')).resolves.not.toThrow();
    });

    it('onAuthStateChange returns unsubscribe function', () => {
      const cb = vi.fn();
      const unsub = onAuthStateChange(cb);
      expect(typeof unsub).toBe('function');
      unsub(); // should not throw
    });
  });
});
