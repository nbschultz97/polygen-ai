/**
 * Vercel Edge Function - Gemini Image Generation Proxy
 * Proxies requests to Google's Imagen API
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
const MAX_PROMPT_LENGTH = 5000; // 5K characters max for image prompts

interface ImageGenRequest {
  prompt: string;
  numberOfImages?: number;
  aspectRatio?: string;
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
    const body: ImageGenRequest = await req.json();

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

    // Validate numberOfImages
    const numberOfImages = Math.min(Math.max(body.numberOfImages || 1, 1), 4);

    // Validate aspectRatio
    const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
    const aspectRatio = validAspectRatios.includes(body.aspectRatio || '')
      ? body.aspectRatio
      : '1:1';

    // Call Imagen API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: body.prompt,
        config: {
          numberOfImages,
          aspectRatio,
          outputMimeType: 'image/png',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Imagen API error:', data);
      return new Response(
        JSON.stringify({ error: data.error?.message || 'Image generation failed' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // NOTE: Usage is NOT incremented here. Only incremented after successful
    // code generation (claude.ts / claude-stream.ts) to avoid double-counting.

    // Extract image data
    if (data.generatedImages && data.generatedImages.length > 0) {
      const image = data.generatedImages[0];
      if (image.image?.imageBytes) {
        return new Response(JSON.stringify({ imageBase64: image.image.imageBytes }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'No image generated' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Gemini image proxy error:', error);

    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
