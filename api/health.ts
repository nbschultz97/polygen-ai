/**
 * Health Check API Endpoint
 * Used for uptime monitoring and deployment verification
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '3.0.0',
    environment: process.env.VERCEL_ENV || 'development',
    services: {
      supabase: !!process.env.VITE_SUPABASE_URL,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY
    }
  };

  // Return 200 if all services configured, 503 otherwise
  const allConfigured = Object.values(health.services).every(Boolean);

  return response.status(allConfigured ? 200 : 503).json(health);
}
