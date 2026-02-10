/**
 * Auth Service Tests
 * Since supabase isn't configured in test env, the module uses its internal mockSupabase.
 * We test the exported functions and constants.
 */
import { describe, expect, it, vi } from 'vitest';
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

    it('canGenerate returns not allowed when no profile', async () => {
      const result = await canGenerate('any-id');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('incrementGenerationCount handles error gracefully', async () => {
      await expect(incrementGenerationCount('any-id')).resolves.not.toThrow();
    });

    it('onAuthStateChange returns unsubscribe function', () => {
      const cb = vi.fn();
      const unsub = onAuthStateChange(cb);
      expect(typeof unsub).toBe('function');
      unsub(); // should not throw
    });
  });
});
