/**
 * API Client Tests
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock authService/supabase before importing apiClient
vi.mock('../../services/authService', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import { getAuthToken, apiRequest, apiPost } from '../../services/apiClient';
import { supabase } from '../../services/authService';

describe('API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuthToken', () => {
    it('returns token from session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'abc123' } },
        error: null,
      } as any);
      const token = await getAuthToken();
      expect(token).toBe('abc123');
    });

    it('returns null when no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);
      expect(await getAuthToken()).toBeNull();
    });

    it('returns null on error', async () => {
      vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('fail'));
      expect(await getAuthToken()).toBeNull();
    });
  });

  describe('apiRequest', () => {
    it('throws when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);
      await expect(apiRequest('/api/test')).rejects.toThrow('Authentication required');
    });

    it('makes authenticated request and returns JSON', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'tok' } },
        error: null,
      } as any);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'hello' }),
      });

      const result = await apiRequest<{ data: string }>('/api/test');
      expect(result.data).toBe('hello');
      expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }));
    });

    it('throws on non-ok response with error message', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'tok' } },
        error: null,
      } as any);
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Forbidden' }),
      });
      await expect(apiRequest('/api/test')).rejects.toThrow('Forbidden');
    });

    it('throws generic error when response body not parseable', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'tok' } },
        error: null,
      } as any);
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('bad json')),
      });
      await expect(apiRequest('/api/test')).rejects.toThrow('Request failed');
    });
  });

  describe('apiPost', () => {
    it('sends POST with JSON body', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'tok' } },
        error: null,
      } as any);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await apiPost('/api/create', { name: 'test' });
      expect(global.fetch).toHaveBeenCalledWith('/api/create', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }));
    });
  });
});
