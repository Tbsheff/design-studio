import { chmodSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { claudeCandidates, claudeVersion, compareClaudeVersion, expectedClaudeVersion, parseVersion, resolveClaude, type ClaudeFs } from './claude-cli.js';

const HOME = '/Users/test';

function fakeFs(files: Record<string, string>): ClaudeFs {
  return {
    isExecutable: (file) => file in files,
    realpath: (file) => files[file] ?? file,
  };
}

describe('claude resolver', () => {
  it('uses STUDIO_CLAUDE_PATH first, even when PATH has another claude', () => {
    const fs = fakeFs({ '/custom/claude': '/custom/claude', '/opt/homebrew/bin/claude': '/opt/homebrew/bin/claude' });
    const found = resolveClaude({ env: { STUDIO_CLAUDE_PATH: '/custom/claude' }, home: HOME, searchPath: ['/opt/homebrew/bin'] }, fs);
    expect(found).toEqual({ path: '/custom/claude', realPath: '/custom/claude', source: 'env' });
  });

  it('does not fall back when STUDIO_CLAUDE_PATH points at nothing', () => {
    const fs = fakeFs({ '/opt/homebrew/bin/claude': '/opt/homebrew/bin/claude' });
    expect(resolveClaude({ env: { STUDIO_CLAUDE_PATH: '/missing/claude' }, home: HOME, searchPath: ['/opt/homebrew/bin'] }, fs)).toBeNull();
  });

  it('takes the first login-shell PATH hit before known locations', () => {
    const fs = fakeFs({ '/Users/test/.nvm/versions/node/v24/bin/claude': '/x/cli.js', '/Users/test/.local/bin/claude': '/y/claude' });
    const found = resolveClaude({ env: {}, home: HOME, searchPath: ['relative/bin', '/Users/test/.nvm/versions/node/v24/bin'] }, fs);
    expect(found).toMatchObject({ path: '/Users/test/.nvm/versions/node/v24/bin/claude', realPath: '/x/cli.js', source: 'path' });
  });

  it('falls back to known locations in order, ending with the npm prefix', () => {
    const candidates = claudeCandidates({ env: { NPM_CONFIG_PREFIX: '/npm' }, home: HOME, searchPath: ['/opt/homebrew/bin'] }).map((candidate) => candidate.file);
    expect(candidates).toEqual([
      '/opt/homebrew/bin/claude',
      '/Users/test/.local/bin/claude',
      '/Users/test/.claude/local/claude',
      '/usr/local/bin/claude',
      '/Users/test/.npm-global/bin/claude',
      '/npm/bin/claude',
    ]);
    const fs = fakeFs({ '/Users/test/.claude/local/claude': '/Users/test/.claude/local/claude' });
    expect(resolveClaude({ env: {}, home: HOME, searchPath: [] }, fs)?.source).toBe('known');
  });

  it('returns null when nothing is found', () => {
    expect(resolveClaude({ env: {}, home: HOME, searchPath: ['/usr/bin'] }, fakeFs({}))).toBeNull();
  });

  it('resolves a real symlink but keeps the launcher path', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'studio-claude-link-'));
    const versions = path.join(root, 'share', 'claude', 'versions');
    const bin = path.join(root, 'bin');
    mkdirSync(versions, { recursive: true });
    mkdirSync(bin);
    const target = path.join(versions, '2.1.309');
    writeFileSync(target, '#!/bin/sh\nprintf "2.1.309 (Claude Code)"\n');
    chmodSync(target, 0o755);
    symlinkSync(target, path.join(bin, 'claude'));
    writeFileSync(path.join(root, 'claude'), 'not executable');
    const found = resolveClaude({ env: {}, home: path.join(root, 'home'), searchPath: [root, bin] });
    expect(found?.path).toBe(path.join(bin, 'claude'));
    expect(found?.realPath.endsWith(path.join('versions', '2.1.309'))).toBe(true);
  });
});

describe('claude version', () => {
  it('parses CLI output', () => {
    expect(parseVersion('2.1.309 (Claude Code)\n')).toEqual([2, 1, 309]);
    expect(parseVersion('no version')).toBeNull();
  });

  it('compares on major.minor only', () => {
    expect(compareClaudeVersion('2.1.200', '2.1.307')).toBe('ok');
    expect(compareClaudeVersion('2.1.400', '2.1.307')).toBe('ok');
    expect(compareClaudeVersion('2.0.999', '2.1.307')).toBe('older');
    expect(compareClaudeVersion('1.9.0', '2.1.307')).toBe('older');
    expect(compareClaudeVersion('2.2.0', '2.1.307')).toBe('newer');
    expect(compareClaudeVersion('3.0.0', '2.1.307')).toBe('newer');
    expect(compareClaudeVersion(null, '2.1.307')).toBe('unknown');
    expect(compareClaudeVersion('2.1.0', null)).toBe('unknown');
  });

  it('reads the expected CLI version from the SDK package metadata', () => {
    const read = (file: string): string => {
      expect(file).toBe(path.join('/mods', '@anthropic-ai', 'claude-agent-sdk', 'package.json'));
      return JSON.stringify({ version: '0.3.307', claudeCodeVersion: '2.1.307' });
    };
    expect(expectedClaudeVersion('/mods', read)).toBe('2.1.307');
    expect(expectedClaudeVersion('/nonexistent')).toBeNull();
    expect(expectedClaudeVersion(path.resolve('node_modules'))).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('runs --version on the binary', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-claude-version-'));
    const file = path.join(dir, 'claude');
    writeFileSync(file, '#!/bin/sh\n[ "$1" = "--version" ] && printf "2.1.309 (Claude Code)"\n');
    chmodSync(file, 0o755);
    expect(await claudeVersion(file, { PATH: '/usr/bin:/bin' })).toBe('2.1.309');
    expect(await claudeVersion(path.join(dir, 'missing'), { PATH: '/usr/bin:/bin' })).toBeNull();
  });
});
