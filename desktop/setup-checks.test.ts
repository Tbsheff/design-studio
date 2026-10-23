import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { bundledGit } from './git-choice.js';
import { checkClaude, checkDesignMemory, checkGit, checkNetwork, needsAttention, type CheckResult, type ClaudeSetup } from './setup-checks.js';

function fakeClaude(auth: string, version = '2.1.309 (Claude Code)'): ClaudeSetup['location'] {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-fake-claude-'));
  const file = path.join(dir, 'claude');
  writeFileSync(file, `#!/bin/sh\nif [ "$1" = "--version" ]; then printf '%s' '${version}'; else printf '%s' '${auth}'; fi\n`);
  chmodSync(file, 0o755);
  return { path: file, realPath: file, source: 'path' };
}

const ENV = { PATH: '/usr/bin:/bin' };
const EXPECTED = '2.1.307';

function setup(location: ClaudeSetup['location']): ClaudeSetup {
  return { location, expectedVersion: EXPECTED };
}

describe('setup checks', () => {
  it('logged-out claude fails with the copy and Terminal fixes, and the screen is needed', async () => {
    const result = await checkClaude(setup(fakeClaude('{"loggedIn":false}')), ENV);
    expect(result).toMatchObject({ status: 'fail', required: true, fixes: ['copy-claude', 'open-terminal'] });
    expect(needsAttention([result])).toBe(true);
  });

  it('logged-in claude with the same major.minor passes and shows its version', async () => {
    const result = await checkClaude(setup(fakeClaude('{"loggedIn":true}')), ENV);
    expect(result).toMatchObject({ status: 'ok', detail: 'Logged in. Claude Code 2.1.309.' });
  });

  it('no claude found fails with install instructions', async () => {
    const result = await checkClaude(setup(null), ENV);
    expect(result).toMatchObject({ status: 'fail', required: true, fixes: ['copy-claude-install', 'open-terminal'] });
    expect(result.detail).toContain('npm i -g @anthropic-ai/claude-code');
  });

  it('an older claude fails and asks for an update before the auth check', async () => {
    const result = await checkClaude(setup(fakeClaude('{"loggedIn":true}', '2.0.99 (Claude Code)')), ENV);
    expect(result).toMatchObject({ status: 'fail', fixes: ['copy-claude-install', 'open-terminal'] });
    expect(result.detail).toMatch(/^Update Claude Code: 2\.0\.99 is older than 2\.1\.307\. Run `claude update`/);
  });

  it('a newer claude only warns', async () => {
    const result = await checkClaude(setup(fakeClaude('{"loggedIn":true}', '2.2.0 (Claude Code)')), ENV);
    expect(result.status).toBe('warn');
    expect(needsAttention([result])).toBe(false);
  });

  it('missing git fails and offers Command Line Tools; bundled git passes with the same fix', () => {
    expect(checkGit({ kind: 'missing', binary: null, env: {} })).toMatchObject({ status: 'fail', fixes: ['install-clt'] });
    expect(checkGit({ kind: 'bundled', binary: '/x/git', env: {} })).toMatchObject({ status: 'ok', fixes: ['install-clt'] });
    expect(bundledGit('/nonexistent').kind).toBe('missing');
  });

  it('network and design memory never block', async () => {
    const offline = await checkNetwork(() => Promise.reject(new Error('offline')));
    const memory = checkDesignMemory({ DESIGN_MEMORY_HOME: '/nonexistent/design-memory' });
    const results: CheckResult[] = [offline, memory];
    expect(results.map((result) => result.status)).toEqual(['warn', 'warn']);
    expect(needsAttention(results)).toBe(false);
  });
});
