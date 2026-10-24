import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { alive } from './processes';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TSX = path.join(HERE, '..', '..', 'node_modules', '.bin', 'tsx');
const LINES = 30;

let dir = '';
let grandchildPid = 0;

afterEach(() => {
  if (grandchildPid && alive(grandchildPid)) process.kill(grandchildPid, 'SIGKILL');
  grandchildPid = 0;
  if (dir) rmSync(dir, { recursive: true, force: true });
});

async function waitForFile(file: string, timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(file)) return readFileSync(file, 'utf8');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`no ${file} within ${timeoutMs}ms`);
}

describe('spawnDetachedToLog', () => {
  it('keeps a detached child writing after the process that started it exits', async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'logged-spawn-'));
    const logPath = path.join(dir, 'server.log');
    const exitPath = path.join(dir, 'exit.txt');
    const writer = [
      `process.on('exit', (code) => require('node:fs').writeFileSync(${JSON.stringify(exitPath)}, String(code)));`,
      'let line = 0;',
      `setTimeout(() => { const timer = setInterval(() => { console.log('line ' + line); console.error('err ' + line); line += 1; if (line === ${LINES}) clearInterval(timer); }, 10); }, 300);`,
    ].join('\n');
    const starter = path.join(dir, 'starter.ts');
    writeFileSync(
      starter,
      [
        `import { spawnDetachedToLog } from ${JSON.stringify(pathToFileURL(path.join(HERE, 'logged-spawn.ts')).href)};`,
        `const child = spawnDetachedToLog(process.execPath, ['-e', ${JSON.stringify(writer)}], { cwd: ${JSON.stringify(dir)}, env: process.env }, ${JSON.stringify(logPath)});`,
        'child.unref();',
        'console.log(String(child.pid));',
        'process.exit(0);',
      ].join('\n'),
    );
    grandchildPid = Number(execFileSync(TSX, [starter], { cwd: dir, encoding: 'utf8' }).trim());
    expect(grandchildPid).toBeGreaterThan(0);

    expect(await waitForFile(exitPath, 15_000)).toBe('0');
    const log = readFileSync(logPath, 'utf8');
    expect(log).toContain(`line ${LINES - 1}`);
    expect(log).toContain(`err ${LINES - 1}`);
  }, 30_000);
});
