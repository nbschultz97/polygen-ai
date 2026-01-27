/**
 * Streaming Client for Claude API
 * Handles SSE consumption and text accumulation from streaming responses
 */

import { getAuthToken } from './apiClient';

export interface StreamCallbacks {
  onChunk: (chunk: string, fullText: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

// Timeout for receiving chunks (2 minutes)
const STREAM_CHUNK_TIMEOUT = 120000;

/**
 * Stream Claude API response via SSE
 * Returns the complete accumulated text when done
 */
export async function streamClaudeResponse(
  requestBody: any,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<string> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  const response = await fetch('/api/claude-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorBody?.error || `API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let lastChunkTime = Date.now();

  // Set up timeout checker
  const timeoutChecker = setInterval(() => {
    if (Date.now() - lastChunkTime > STREAM_CHUNK_TIMEOUT) {
      clearInterval(timeoutChecker);
      reader.cancel();
      callbacks.onError(new Error('Stream timeout: no data received for 2 minutes'));
    }
  }, 10000);

  try {
    while (true) {
      // Check abort signal
      if (abortSignal?.aborted) {
        clearInterval(timeoutChecker);
        reader.cancel();
        throw new DOMException('Request was aborted', 'AbortError');
      }

      const { done, value } = await reader.read();
      lastChunkTime = Date.now();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          // Check for done signal
          if (data === '[DONE]') {
            clearInterval(timeoutChecker);
            callbacks.onComplete(fullText);
            return fullText;
          }

          try {
            const event = JSON.parse(data);

            // Handle error events from server
            if (event.error) {
              throw new Error(event.error);
            }

            // Detect truncation: max_tokens reached means incomplete code
            // This prevents "Lazy Coding" - incomplete code execution
            if (event.type === 'message_stop' || event.type === 'message_delta') {
              const stopReason = event.delta?.stop_reason || event.stop_reason;
              if (stopReason === 'max_tokens') {
                throw new Error(
                  'Response truncated: MAX_TOKENS reached. The generated code may be incomplete. Please try again with a simpler request or continue the generation.'
                );
              }
            }

            // Extract text from content_block_delta events
            // Anthropic stream format: { type: 'content_block_delta', delta: { type: 'text_delta', text: '...' } }
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const chunk = event.delta.text;
              fullText += chunk;
              callbacks.onChunk(chunk, fullText);
            }
          } catch (parseError) {
            // Ignore parse errors for non-JSON lines (empty lines, etc.)
            if (data.trim() !== '' && !(parseError instanceof SyntaxError)) {
              console.warn('Failed to parse SSE event:', data, parseError);
            }
          }
        }
      }
    }

    // Stream ended without [DONE] signal (shouldn't normally happen)
    clearInterval(timeoutChecker);
    callbacks.onComplete(fullText);
    return fullText;
  } catch (error) {
    clearInterval(timeoutChecker);

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    reader.releaseLock();
  }
}

export const streamingClient = {
  streamClaudeResponse,
};

export default streamingClient;
