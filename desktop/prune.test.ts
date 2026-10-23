import { existsSync, lstatSync, mkdirSync, mkdtempSync, readlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isShipped } from './build.js';
import { isJunkFile, linkEsbuildBinary, pruneModules } from './prune.js';

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'studio-prune-'));
  for (const [file, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), body);
  }
  return root;
}

describe('module pruning', () => {
  it('keeps licenses and code, drops maps and docs, and drops types only when asked', () => {
    expect(isJunkFile('LICENSE.md', { keepTypes: false })).toBe(false);
    expect(isJunkFile('index.js', { keepTypes: false })).toBe(false);
    expect(isJunkFile('index.js.map', { keepTypes: true })).toBe(true);
    expect(isJunkFile('README.md', { keepTypes: true })).toBe(true);
    expect(isJunkFile('index.d.ts', { keepTypes: true })).toBe(false);
    expect(isJunkFile('index.d.mts', { keepTypes: false })).toBe(true);
    expect(isJunkFile('source.ts', { keepTypes: false })).toBe(true);
  });

  it('removes junk folders inside packages but never a package with that name', () => {
    const root = tree({
      'test/package.json': '{}',
      'pkg/test/a.js': '',
      'pkg/docs/a.html': '',
      'pkg/lib/index.js': '',
      '@scope/docs/index.js': '',
      'pkg/node_modules/doc/index.js': '',
      'typescript/lib/de/diagnosticMessages.generated.json': '',
      'typescript/lib/tsserver.js': '',
      'typescript/lib/_tsc.js': '',
      'typescript/lib/lib.dom.d.ts': '',
    });
    const stats = pruneModules(root, { keepTypes: true });
    expect(existsSync(path.join(root, 'test', 'package.json'))).toBe(true);
    expect(existsSync(path.join(root, '@scope', 'docs', 'index.js'))).toBe(true);
    expect(existsSync(path.join(root, 'pkg', 'node_modules', 'doc', 'index.js'))).toBe(true);
    expect(existsSync(path.join(root, 'pkg', 'lib', 'index.js'))).toBe(true);
    expect(existsSync(path.join(root, 'pkg', 'test'))).toBe(false);
    expect(existsSync(path.join(root, 'pkg', 'docs'))).toBe(false);
    expect(existsSync(path.join(root, 'typescript', 'lib', 'de'))).toBe(false);
    expect(existsSync(path.join(root, 'typescript', 'lib', 'tsserver.js'))).toBe(false);
    expect(existsSync(path.join(root, 'typescript', 'lib', '_tsc.js'))).toBe(true);
    expect(existsSync(path.join(root, 'typescript', 'lib', 'lib.dom.d.ts'))).toBe(true);
    expect(stats.files).toBe(4);
  });

  it('links the esbuild copy to the identical platform binary, and leaves a different one alone', () => {
    const same = tree({ 'esbuild/bin/esbuild': 'binary', '@esbuild/darwin-arm64/bin/esbuild': 'binary' });
    expect(linkEsbuildBinary(same, 'arm64').bytes).toBe(6);
    const link = path.join(same, 'esbuild', 'bin', 'esbuild');
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe(path.join('..', '..', '@esbuild', 'darwin-arm64', 'bin', 'esbuild'));
    const different = tree({ 'esbuild/bin/esbuild': 'one', '@esbuild/darwin-arm64/bin/esbuild': 'two' });
    expect(linkEsbuildBinary(different, 'arm64').files).toBe(0);
  });

  it('never ships a Claude Code platform binary package', () => {
    expect(isShipped('@anthropic-ai/claude-agent-sdk-darwin-arm64')).toBe(false);
    expect(isShipped('@anthropic-ai/claude-agent-sdk-linux-x64-musl')).toBe(false);
    expect(isShipped('@anthropic-ai/claude-agent-sdk')).toBe(true);
    expect(isShipped('playwright-core')).toBe(false);
  });
});
