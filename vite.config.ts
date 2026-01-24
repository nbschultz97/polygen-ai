import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: 'localhost', // Changed from 0.0.0.0 for security - only listen on localhost
      },
      plugins: [react()],
      define: {
        // Gemini (Planner Agent)
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_MODEL': JSON.stringify(env.GEMINI_MODEL || 'gemini-3-pro-preview'),
        'process.env.THINKING_LEVEL': JSON.stringify(env.THINKING_LEVEL || 'high'),
        // Claude (Coder Agent)
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
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
