import type { Metafile } from 'esbuild';
import { describe, expect, it } from 'vitest';
import { dependencyClosure, importedPackages } from './build.js';

function meta(paths: string[]): Metafile {
  return { inputs: {}, outputs: { 'index.js': { bytes: 1, inputs: {}, exports: [], imports: paths.map((path) => ({ path, kind: 'import-statement', external: true })) } } };
}

describe('server package list', () => {
  it('keeps external package roots, drops node builtins and playwright-core', () => {
    expect(importedPackages([meta(['hono/node-server', '@anthropic-ai/claude-agent-sdk', 'node:fs', 'playwright-core', 'vite'])])).toEqual(['@anthropic-ai/claude-agent-sdk', 'hono', 'vite']);
  });

  it('follows runtime dependencies but not dev-only ones', () => {
    const dirs = dependencyClosure(['hono']).map((dir) => dir.split('node_modules/').pop());
    expect(dirs).toContain('hono');
    expect(dirs).not.toContain('react');
  });
});
