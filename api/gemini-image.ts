/**
 * Vercel Edge Function - Gemini Image Generation Proxy
 * Proxies requests to Google's Imagen API
 * API key is stored server-side, never exposed to frontend
 */

export const config = {
  runtime: 'edge',
};

interface ImageGenRequest {
  prompt: string;
  numberOfImages?: number;
  aspectRatio?: string;
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Gemini API not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: ImageGenRequest = await req.json();

    // Validate request
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
          numberOfImages: body.numberOfImages || 1,
          aspectRatio: body.aspectRatio || '1:1',
          outputMimeType: 'image/png'
        }
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

    // Extract image data
    if (data.generatedImages && data.generatedImages.length > 0) {
      const image = data.generatedImages[0];
      if (image.image?.imageBytes) {
        return new Response(
          JSON.stringify({ imageBase64: image.image.imageBytes }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store'
            }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'No image generated' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Gemini image proxy error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
