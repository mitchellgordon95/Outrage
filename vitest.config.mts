import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'happy-dom', // or 'jsdom', 'node'
    setupFiles: [], // Optional: for global setup scripts
    include: ['src/**/*.test.{ts,tsx}'], // Pattern to find test files
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
    },
    // Mock environment variables
    // This is a basic way; for more complex scenarios, consider dotenv or specific setup files
    env: {
      ANTHROPIC_MODEL: 'claude-test-model',
    },
  },
});
