import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.GEMINI_MODEL = 'gemini-3-pro-preview';
process.env.CODER_MODEL = 'claude-sonnet-4-20250514';
process.env.USE_MULTI_AGENT = 'false';
