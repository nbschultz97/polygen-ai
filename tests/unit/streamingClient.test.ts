/**
 * Streaming Client Unit Tests
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock apiClient
vi.mock('../../services/apiClient', () => ({
  getAuthToken: vi.fn().mockResolvedValue('mock-token'),
}));

import { streamClaudeResponse, type StreamCallbacks } from '../../services/streamingClient';
import { getAuthToken } from '../../services/apiClient';

// Helper to create a readable stream from SSE data
function createSSEStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = events.map((e) => encoder.encode(e));
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++]);
      } else {
        controller.close();
      }
    },
  });
}

describe('Streaming Client', () => {
  let mockCallbacks: StreamCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallbacks = {
      onChunk: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };
  });

  it('throws when not authenticated', async () => {
    vi.mocked(getAuthToken).mockResolvedValueOnce(null);

    await expect(
      streamClaudeResponse({}, mockCallbacks)
    ).rejects.toThrow('Authentication required');
  });

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    await expect(
      streamClaudeResponse({}, mockCallbacks)
    ).rejects.toThrow('Server error');
  });

  it('throws when response body is not readable', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    });

    await expect(
      streamClaudeResponse({}, mockCallbacks)
    ).rejects.toThrow('Response body is not readable');
  });

  it('processes SSE text delta events and calls onChunk', async () => {
    const stream = createSSEStream([
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" World"}}\n\n',
      'data: [DONE]\n\n',
    ]);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const result = await streamClaudeResponse({ prompt: 'test' }, mockCallbacks);

    expect(result).toBe('Hello World');
    expect(mockCallbacks.onChunk).toHaveBeenCalledTimes(2);
    expect(mockCallbacks.onChunk).toHaveBeenCalledWith('Hello', 'Hello');
    expect(mockCallbacks.onChunk).toHaveBeenCalledWith(' World', 'Hello World');
    expect(mockCallbacks.onComplete).toHaveBeenCalledWith('Hello World');
  });

  it('warns on max_tokens truncation but completes stream', async () => {
    // The inner try/catch swallows the error with console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stream = createSSEStream([
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"partial"}}\n\n',
      'data: {"type":"message_delta","delta":{"stop_reason":"max_tokens"}}\n\n',
      'data: [DONE]\n\n',
    ]);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const result = await streamClaudeResponse({}, mockCallbacks);
    expect(result).toBe('partial');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns on server error events but completes stream', async () => {
    // The inner try/catch swallows the error with console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stream = createSSEStream([
      'data: {"error":"Rate limit exceeded"}\n\n',
      'data: [DONE]\n\n',
    ]);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const result = await streamClaudeResponse({}, mockCallbacks);
    expect(result).toBe('');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('sends auth token in request headers', async () => {
    const stream = createSSEStream(['data: [DONE]\n\n']);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    await streamClaudeResponse({ prompt: 'test' }, mockCallbacks);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/claude-stream',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      })
    );
  });

  it('completes when stream ends without [DONE]', async () => {
    const stream = createSSEStream([
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"text"}}\n\n',
    ]);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const result = await streamClaudeResponse({}, mockCallbacks);
    expect(result).toBe('text');
    expect(mockCallbacks.onComplete).toHaveBeenCalledWith('text');
  });
});
