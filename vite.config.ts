import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load from .env files first, then fall back to system env vars (for Vercel)
    // NOTE: API keys (GEMINI_API_KEY, ANTHROPIC_API_KEY) are SERVER-SIDE ONLY
    // They are read by Vercel Edge Functions in /api/, never exposed to frontend
    const fileEnv = loadEnv(mode, '.', '');
    const env = {
      // Non-sensitive config only - safe to expose to frontend
      GEMINI_MODEL: fileEnv.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      CODER_MODEL: fileEnv.CODER_MODEL || process.env.CODER_MODEL || 'claude-sonnet-4-20250514',
      USE_MULTI_AGENT: fileEnv.USE_MULTI_AGENT || process.env.USE_MULTI_AGENT || 'false',
    };
    return {
      server: {
        port: 3000,
        host: 'localhost',
        proxy: {
          // Proxy /api/claude to Anthropic API
          '/api/claude': {
            target: 'https://api.anthropic.com',
            changeOrigin: true,
            rewrite: (path) => '/v1/messages',
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                // Add Anthropic API headers
                proxyReq.setHeader('x-api-key', env.ANTHROPIC_API_KEY || '');
                proxyReq.setHeader('anthropic-version', '2023-06-01');
                proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
              });
            }
          }
        }
      },
      plugins: [react()],
      define: {
        // API keys are now SERVER-SIDE ONLY via /api/gemini and /api/claude proxies
        // Only non-sensitive config is exposed to frontend
        'process.env.GEMINI_MODEL': JSON.stringify(env.GEMINI_MODEL),
        'process.env.CODER_MODEL': JSON.stringify(env.CODER_MODEL),
        'process.env.USE_MULTI_AGENT': JSON.stringify(env.USE_MULTI_AGENT),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        sourcemap: mode !== 'production', // Disable sourcemaps in production to avoid leaking code
      }
    };
});
