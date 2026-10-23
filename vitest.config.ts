import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'desktop/**/*.test.ts'],
    env: {
      STUDIO_CLAUDE_HOME: '/nonexistent/design-studio-test-claude-home',
      STUDIO_PROJECTS_DIR: path.join(os.tmpdir(), 'design-studio-vitest-projects'),
    },
  },
});
