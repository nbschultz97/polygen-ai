/**
 * Vercel Edge Function - Claude Streaming API Proxy
 * Uses Server-Sent Events (SSE) to stream Claude responses
 * Prevents timeout issues on 30-60s generations
 *
 * SECURITY:
 * - API key is stored server-side, never exposed to frontend
 * - Requires authentication via JWT token
 * - Rate limited per IP address
 * - Validates input size to prevent abuse
 */

import Anthropic from '@anthropic-ai/sdk';
import { verifyAuth, incrementUsage, authError } from './lib/auth';

export const config = {
  runtime: 'edge',
};

// Input validation limits (same as claude.ts)
const MAX_MESSAGE_LENGTH = 100000; // 100K characters max per message
const MAX_MESSAGES = 50; // Max messages in conversation

interface ClaudeStreamRequest {
  model: string;
  max_tokens: number;
  system?: string | { type: string; text: string; cache_control?: { type: string } }[];
  messages: { role: string; content: string | any[] }[];
}

export default async function handler(req: Request): Promise<Response> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ============================================
  // SECURITY: Verify authentication & rate limit
  // ============================================
  const auth = await verifyAuth(req);
  if (!auth.success) {
    return authError(auth.error || 'Unauthorized', auth.status || 401);
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Claude API not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: ClaudeStreamRequest = await req.json();

    // ============================================
    // SECURITY: Input validation
    // ============================================
    if (!body.model || !body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: `Too many messages (max ${MAX_MESSAGES})` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate each message
    for (const msg of body.messages) {
      if (!msg.role || !msg.content) {
        return new Response(JSON.stringify({ error: 'Invalid message format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (typeof msg.content === 'string' && msg.content.length > MAX_MESSAGE_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Initialize Anthropic client
    const client = new Anthropic({ apiKey });

    // Create streaming response from Claude
    const stream = await client.messages.create({
      model: body.model,
      max_tokens: Math.min(body.max_tokens || 8192, 16384), // Cap at 16K tokens
      system: body.system as any,
      messages: body.messages as Anthropic.MessageParam[],
      stream: true, // Enable streaming
    });

    // Create SSE readable stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            // Format as SSE: data: {json}\n\n
            const data = JSON.stringify(event);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // ============================================
          // SECURITY: Increment usage counter after success
          // ============================================
          if (auth.user?.id) {
            await incrementUsage(auth.user.id);
          }
        } catch (error: any) {
          // Send error as SSE event
          const errorData = JSON.stringify({ error: error.message || 'Stream error' });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error: any) {
    console.error('Claude stream error:', error);

    // Handle Anthropic-specific errors
    if (error?.status) {
      return new Response(JSON.stringify({ error: error.message || 'API error' }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
