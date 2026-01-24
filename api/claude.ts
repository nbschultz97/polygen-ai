/**
 * Vercel Edge Function - Claude API Proxy
 * Proxies requests to Anthropic's API to avoid CORS issues
 * API key is stored server-side, never exposed to frontend
 */

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  runtime: 'edge',
};

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

    // Validate request
    if (!body.model || !body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Anthropic client
    const client = new Anthropic({ apiKey });

    // Make request to Claude
    const response = await client.messages.create({
      model: body.model,
      max_tokens: body.max_tokens || 8192,
      system: body.system,
      messages: body.messages as Anthropic.MessageParam[],
    });

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
