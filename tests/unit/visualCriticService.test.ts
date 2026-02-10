/**
 * Visual Critic Service Tests
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  captureCanvasScreenshot,
  issueToErrorMessage,
  needsRegeneration,
  generateCritiqueFeedback,
  critiqueRender,
  type VisualCritiqueResult,
  type VisualIssue,
} from '../../services/visualCriticService';

// Mock apiClient
vi.mock('../../services/apiClient', () => ({
  getAuthToken: vi.fn().mockResolvedValue('test-token'),
}));

describe('Visual Critic Service', () => {
  describe('captureCanvasScreenshot', () => {
    it('returns base64 from canvas', () => {
      const mockCanvas = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,abc123'),
      } as unknown as HTMLCanvasElement;
      const result = captureCanvasScreenshot(mockCanvas);
      expect(result).toBe('abc123');
    });

    it('returns null on error', () => {
      const mockCanvas = {
        toDataURL: vi.fn().mockImplementation(() => { throw new Error('tainted'); }),
      } as unknown as HTMLCanvasElement;
      const result = captureCanvasScreenshot(mockCanvas);
      expect(result).toBeNull();
    });
  });

  describe('issueToErrorMessage', () => {
    it('formats text issue', () => {
      const issue: VisualIssue = { type: 'text', description: 'Mirrored text', severity: 'high', location: 'front face' };
      const msg = issueToErrorMessage(issue);
      expect(msg).toContain('[Visual Critic - HIGH]');
      expect(msg).toContain('mirror()');
      expect(msg).toContain('(at front face)');
    });

    it('formats disconnected issue', () => {
      const issue: VisualIssue = { type: 'disconnected', description: 'Floating part', severity: 'medium' };
      const msg = issueToErrorMessage(issue);
      expect(msg).toContain('union()');
    });

    it('formats scale issue', () => {
      const issue: VisualIssue = { type: 'scale', description: 'Too big', severity: 'low' };
      expect(issueToErrorMessage(issue)).toContain('dimensions');
    });

    it('formats missing_feature issue', () => {
      const issue: VisualIssue = { type: 'missing_feature', description: 'No handle', severity: 'high' };
      expect(issueToErrorMessage(issue)).toContain('missing geometry');
    });

    it('formats orientation issue', () => {
      const issue: VisualIssue = { type: 'orientation', description: 'Upside down', severity: 'medium' };
      expect(issueToErrorMessage(issue)).toContain('rotation');
    });

    it('formats generic geometry issue', () => {
      const issue: VisualIssue = { type: 'geometry', description: 'Weird shape', severity: 'low' };
      expect(issueToErrorMessage(issue)).toContain('Geometry issue');
    });
  });

  describe('needsRegeneration', () => {
    it('returns false when approved', () => {
      expect(needsRegeneration({ approved: true, issues: [], suggestions: [], confidence: 0.9 })).toBe(false);
    });

    it('returns true for high severity issues', () => {
      const critique: VisualCritiqueResult = {
        approved: false,
        issues: [{ type: 'text', description: 'bad', severity: 'high' }],
        suggestions: [],
        confidence: 0.8,
      };
      expect(needsRegeneration(critique)).toBe(true);
    });

    it('returns true for 2+ medium severity issues', () => {
      const critique: VisualCritiqueResult = {
        approved: false,
        issues: [
          { type: 'scale', description: 'a', severity: 'medium' },
          { type: 'orientation', description: 'b', severity: 'medium' },
        ],
        suggestions: [],
        confidence: 0.7,
      };
      expect(needsRegeneration(critique)).toBe(true);
    });

    it('returns false for single medium severity issue', () => {
      const critique: VisualCritiqueResult = {
        approved: false,
        issues: [{ type: 'scale', description: 'a', severity: 'medium' }],
        suggestions: [],
        confidence: 0.7,
      };
      expect(needsRegeneration(critique)).toBe(false);
    });

    it('returns false for only low severity issues', () => {
      const critique: VisualCritiqueResult = {
        approved: false,
        issues: [{ type: 'geometry', description: 'minor', severity: 'low' }],
        suggestions: [],
        confidence: 0.6,
      };
      expect(needsRegeneration(critique)).toBe(false);
    });
  });

  describe('generateCritiqueFeedback', () => {
    it('converts all issues to error messages', () => {
      const critique: VisualCritiqueResult = {
        approved: false,
        issues: [
          { type: 'text', description: 'Mirrored', severity: 'high' },
          { type: 'scale', description: 'Too big', severity: 'medium' },
        ],
        suggestions: [],
        confidence: 0.8,
      };
      const feedback = generateCritiqueFeedback(critique);
      expect(feedback).toHaveLength(2);
      expect(feedback[0]).toContain('mirror()');
      expect(feedback[1]).toContain('dimensions');
    });
  });

  describe('critiqueRender', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.mock('../../services/apiClient', () => ({
        getAuthToken: vi.fn().mockResolvedValue('test-token'),
      }));
    });

    it('returns approved on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
      const result = await critiqueRender('base64data', 'make a cube');
      expect(result.approved).toBe(true);
      expect(result.confidence).toBe(0);
    });

    it('returns approved on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      const result = await critiqueRender('base64data', 'make a cube');
      expect(result.approved).toBe(true);
      expect(result.confidence).toBe(0);
    });

    it('parses valid JSON response', async () => {
      const mockResponse = {
        approved: false,
        issues: [{ type: 'text', description: 'Mirrored', severity: 'high' }],
        suggestions: ['Fix text'],
        confidence: 0.9,
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockResponse) }],
        }),
      });
      const result = await critiqueRender('base64data', 'make a cube');
      expect(result.approved).toBe(false);
      expect(result.issues).toHaveLength(1);
    });

    it('handles unparseable response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'no json here' }] }),
      });
      const result = await critiqueRender('base64data', 'make a cube');
      expect(result.approved).toBe(true);
      expect(result.confidence).toBe(0.5);
    });
  });
});
