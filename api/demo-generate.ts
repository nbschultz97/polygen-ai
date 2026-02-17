/**
 * Vercel Edge Function - Demo Generation (Anonymous)
 * Limited endpoint for anonymous demo users (max 2 generations)
 *
 * SECURITY:
 * - Rate limited per IP (stricter than authenticated)
 * - No auth required, but heavily rate limited
 * - Simplified prompt only (no image, no STL)
 * - Shorter max prompt length
 */

import { checkRateLimit } from './lib/auth';

export const config = {
  runtime: 'edge',
};

const MAX_DEMO_PROMPT_LENGTH = 500; // Short prompts only
const DEMO_RATE_LIMIT_MAX = 5; // 5 requests per minute per IP (stricter)

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Strict IP rate limiting for anonymous users
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed || rateLimit.remaining < 20 - DEMO_RATE_LIMIT_MAX) {
    return new Response(
      JSON.stringify({ error: 'Demo rate limit exceeded. Please sign up for more generations.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY || '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: 'API not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { prompt, pipeline } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.length > MAX_DEMO_PROMPT_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Invalid or too long prompt (max 500 chars for demo)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For demo, we proxy to the appropriate AI endpoint based on pipeline step
    if (pipeline === 'planner') {
      // Use Claude for planning (Gemini free tier is unreliable)
      // Fall back to Gemini only if DEMO_USE_GEMINI_PLANNER is set
      if (process.env.DEMO_USE_GEMINI_PLANNER === 'true' && geminiKey) {
        return await proxyGemini(geminiKey, prompt, body.systemInstruction);
      }
      return await proxyClaude(anthropicKey, body.systemInstruction || '', [
        { role: 'user', content: prompt },
      ], true);
    } else if (pipeline === 'coder') {
      // Proxy to Claude for code generation
      return await proxyClaude(anthropicKey, body.system, body.messages);
    }

    return new Response(JSON.stringify({ error: 'Invalid pipeline step' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Demo generation error:', error);
    return new Response(JSON.stringify({ error: 'Generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function proxyGemini(
  apiKey: string,
  prompt: string,
  systemInstruction?: string
): Promise<Response> {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody: any = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  // Normalize error responses so frontend always gets { error: "string" }
  if (!response.ok) {
    const errorMsg = data?.error?.message || (typeof data?.error === 'string' ? data.error : 'Gemini API error');
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function proxyClaude(apiKey: string, system: string, messages: any[], useLight?: boolean): Promise<Response> {
  const model = useLight
    ? (process.env.PLANNER_MODEL || 'claude-haiku-4-5-20251001')
    : (process.env.CODER_MODEL || 'claude-sonnet-4-20250514');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: system || '',
      messages: messages || [],
    }),
  });

  const data = await response.json();

  // Normalize error responses so frontend always gets { error: "string" }
  if (!response.ok) {
    const errorMsg = data?.error?.message || (typeof data?.error === 'string' ? data.error : 'Claude API error');
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
