import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'desktop/**/*.test.ts'],
    env: { STUDIO_CLAUDE_HOME: '/nonexistent/design-studio-test-claude-home' },
  },
});
