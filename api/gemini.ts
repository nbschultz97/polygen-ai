/**
 * Vercel Edge Function - Gemini API Proxy
 * Proxies requests to Google's Generative AI API
 *
 * SECURITY:
 * - API key is stored server-side, never exposed to frontend
 * - Requires authentication via JWT token
 * - Rate limited per IP address
 * - Validates input size to prevent abuse
 */

import { verifyAuth, authError } from './lib/auth';

export const config = {
  runtime: 'edge',
};

// Input validation limits
const MAX_PROMPT_LENGTH = 50000; // 50K characters max
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB max
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface GeminiRequest {
  model?: string;
  prompt: string;
  imageData?: {
    base64: string;
    mimeType: string;
  };
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Gemini API not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: GeminiRequest = await req.json();

    // ============================================
    // SECURITY: Input validation
    // ============================================
    if (!body.prompt || typeof body.prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid prompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.prompt.length > MAX_PROMPT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate image if provided
    if (body.imageData) {
      if (!body.imageData.base64 || !body.imageData.mimeType) {
        return new Response(JSON.stringify({ error: 'Invalid image data' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (body.imageData.base64.length > MAX_IMAGE_SIZE) {
        return new Response(
          JSON.stringify({ error: `Image too large (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (!VALID_MIME_TYPES.includes(body.imageData.mimeType)) {
        return new Response(
          JSON.stringify({
            error: `Invalid image format. Allowed: ${VALID_MIME_TYPES.join(', ')}`,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const model = body.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    // Build the request parts
    const parts: any[] = [];

    // Add image if provided
    if (body.imageData) {
      parts.push({
        inlineData: {
          mimeType: body.imageData.mimeType,
          data: body.imageData.base64,
        },
      });
    }

    // Add text prompt
    parts.push({ text: body.prompt });

    // Build request body for Gemini API
    const geminiRequestBody: any = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: body.temperature ?? 0.7,
      },
    };

    // Add system instruction if provided
    if (body.systemInstruction) {
      geminiRequestBody.systemInstruction = {
        parts: [{ text: body.systemInstruction }],
      };
    }

    // Add response mime type if provided (for JSON responses)
    if (body.responseMimeType) {
      geminiRequestBody.generationConfig.responseMimeType = body.responseMimeType;
    }

    // Call Gemini API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Gemini API error' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // NOTE: Usage is NOT incremented here (planner step).
    // Usage is only incremented after successful code generation (claude.ts / claude-stream.ts)
    // to avoid charging users when only planning succeeds but coding fails.

    // Extract text from response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(JSON.stringify({ text, raw: data }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Gemini proxy error:', error);

    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
