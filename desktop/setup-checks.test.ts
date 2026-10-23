import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { bundledGit } from './git-choice.js';
import { checkClaude, checkDesignMemory, checkGit, checkNetwork, needsAttention, type CheckResult } from './setup-checks.js';

function fakeClaude(output: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-fake-claude-'));
  const file = path.join(dir, 'claude');
  writeFileSync(file, `#!/bin/sh\nprintf '%s' '${output}'\n`);
  chmodSync(file, 0o755);
  return file;
}

const ENV = { PATH: '/usr/bin:/bin' };

describe('setup checks', () => {
  it('logged-out claude fails with the copy and Terminal fixes, and the screen is needed', async () => {
    const result = await checkClaude(fakeClaude('{"loggedIn":false}'), ENV);
    expect(result).toMatchObject({ status: 'fail', required: true, fixes: ['copy-claude', 'open-terminal'] });
    expect(needsAttention([result])).toBe(true);
  });

  it('logged-in claude passes', async () => {
    expect((await checkClaude(fakeClaude('{"loggedIn":true}'), ENV)).status).toBe('ok');
  });

  it('a missing claude binary fails', async () => {
    expect((await checkClaude('/nonexistent/claude', ENV)).status).toBe('fail');
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
