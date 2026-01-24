import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
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
        'process.env.GEMINI_MODEL': JSON.stringify(env.GEMINI_MODEL || 'gemini-3-pro-preview'),
        'process.env.THINKING_LEVEL': JSON.stringify(env.THINKING_LEVEL || 'high'),
        // Claude (Coder Agent) - Model name only; API key is server-side via /api/claude proxy
        'process.env.CODER_MODEL': JSON.stringify(env.CODER_MODEL || 'claude-sonnet-4-20250514'),
        // Multi-Agent Pipeline
        'process.env.USE_MULTI_AGENT': JSON.stringify(env.USE_MULTI_AGENT || 'false'),
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
