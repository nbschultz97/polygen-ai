/**
 * Vercel Edge Function - Claude API Proxy
 * Proxies requests to Anthropic's API to avoid CORS issues
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

// Input validation limits
const MAX_MESSAGE_LENGTH = 100000; // 100K characters max per message
const MAX_MESSAGES = 50; // Max messages in conversation

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: { role: string; content: string }[];
}

export default async function handler(req: Request): Promise<Response> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
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
    return new Response(
      JSON.stringify({ error: 'Claude API not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: ClaudeRequest = await req.json();

    // ============================================
    // SECURITY: Input validation
    // ============================================
    if (!body.model || !body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: `Too many messages (max ${MAX_MESSAGES})` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate each message
    for (const msg of body.messages) {
      if (!msg.role || !msg.content) {
        return new Response(
          JSON.stringify({ error: 'Invalid message format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
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

    // Make request to Claude
    const response = await client.messages.create({
      model: body.model,
      max_tokens: Math.min(body.max_tokens || 8192, 16384), // Cap at 16K tokens
      system: body.system,
      messages: body.messages as Anthropic.MessageParam[],
    });

    // ============================================
    // SECURITY: Increment usage counter
    // ============================================
    if (auth.user?.id) {
      await incrementUsage(auth.user.id);
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );

  } catch (error: any) {
    console.error('Claude proxy error:', error);

    // Handle Anthropic-specific errors
    if (error?.status) {
      return new Response(
        JSON.stringify({ error: error.message || 'API error' }),
        { status: error.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
