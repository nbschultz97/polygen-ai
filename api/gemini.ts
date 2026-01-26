/**
 * Vercel Edge Function - Gemini API Proxy
 * Proxies requests to Google's Generative AI API
 * API key is stored server-side, never exposed to frontend
 */

export const config = {
  runtime: 'edge',
};

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
    const body: GeminiRequest = await req.json();

    // Validate request
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const model = body.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    // Build the request parts
    const parts: any[] = [];

    // Add image if provided
    if (body.imageData) {
      parts.push({
        inlineData: {
          mimeType: body.imageData.mimeType,
          data: body.imageData.base64
        }
      });
    }

    // Add text prompt
    parts.push({ text: body.prompt });

    // Build request body for Gemini API
    const geminiRequestBody: any = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: body.temperature ?? 0.7,
      }
    };

    // Add system instruction if provided
    if (body.systemInstruction) {
      geminiRequestBody.systemInstruction = {
        parts: [{ text: body.systemInstruction }]
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
      return new Response(
        JSON.stringify({ error: data.error?.message || 'Gemini API error' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract text from response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(
      JSON.stringify({ text, raw: data }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );

  } catch (error: any) {
    console.error('Gemini proxy error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
