import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load from .env files first, then fall back to system env vars (for Vercel)
    const fileEnv = loadEnv(mode, '.', '');
    const env = {
      GEMINI_API_KEY: fileEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
      GEMINI_MODEL: fileEnv.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-pro',
      THINKING_LEVEL: fileEnv.THINKING_LEVEL || process.env.THINKING_LEVEL || 'high',
      ANTHROPIC_API_KEY: fileEnv.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '',
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
        // Gemini (Planner Agent) - Add HTTP referrer restriction in Google Cloud Console
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_MODEL': JSON.stringify(env.GEMINI_MODEL),
        'process.env.THINKING_LEVEL': JSON.stringify(env.THINKING_LEVEL),
        // Claude (Coder Agent) - Model name only; API key is server-side via /api/claude proxy
        'process.env.CODER_MODEL': JSON.stringify(env.CODER_MODEL),
        // Multi-Agent Pipeline
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
