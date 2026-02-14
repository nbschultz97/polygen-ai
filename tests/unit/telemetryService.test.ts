/**
 * Telemetry Service Unit Tests
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock authService before importing telemetryService
const mockInsert = vi.fn();
const mockGetUser = vi.fn();

vi.mock('../../services/authService', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: () => ({
      insert: (data: any) => mockInsert(data),
    }),
  },
}));

import { logLibraryDefect } from '../../services/telemetryService';

describe('Telemetry Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mockInsert.mockResolvedValue({ error: null });
  });

  describe('logLibraryDefect', () => {
    it('inserts defect with user ID into Supabase', async () => {
      await logLibraryDefect({
        moduleName: 'gear_module',
        reasoning: 'Missing tooth profile',
        scadCode: 'module gear() {}',
        pSucc: 0.3,
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          module_name: 'gear_module',
          reasoning: 'Missing tooth profile',
          scad_code: 'module gear() {}',
          p_succ: 0.3,
          user_id: 'user-123',
        })
      );
    });

    it('handles missing user gracefully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await logLibraryDefect({
        moduleName: 'test_module',
        reasoning: 'Test',
        scadCode: 'cube(10);',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          module_name: 'test_module',
          user_id: undefined,
        })
      );
    });

    it('handles Supabase insert errors without throwing', async () => {
      mockInsert.mockResolvedValue({ error: { message: 'DB error' } });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      await logLibraryDefect({
        moduleName: 'failing_module',
        reasoning: 'Test',
        scadCode: 'cube(1);',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('handles auth errors without throwing', async () => {
      mockGetUser.mockRejectedValue(new Error('Auth failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await logLibraryDefect({
        moduleName: 'test',
        reasoning: 'test',
        scadCode: 'cube(1);',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('includes created_at timestamp', async () => {
      await logLibraryDefect({
        moduleName: 'test',
        reasoning: 'test',
        scadCode: 'cube(1);',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          created_at: expect.any(String),
        })
      );
    });
  });
});
