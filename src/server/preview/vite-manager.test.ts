import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BRIDGE_SCRIPT_PATH } from '../../shared/contracts.js';
import type { StudioEventInput } from '../../shared/contracts.js';
import type { EventBus } from '../types.js';
import { ViteManager } from './vite-manager.js';

let root: string;
let manager: ViteManager;
const events: StudioEventInput[] = [];

const bus: EventBus = {
  emit(event) {
    events.push(event);
    return { ...event, seq: events.length, ts: Date.now() } as ReturnType<EventBus['emit']>;
  },
  since: () => [],
  subscribe: () => () => undefined,
};

const CONFIG = `import { writeFileSync } from 'node:fs';
writeFileSync(new URL('./env-dump.json', import.meta.url), JSON.stringify({ pid: process.pid, ppid: process.ppid, keys: Object.keys(process.env), home: process.env.HOME }));
export default {};
`;

beforeAll(async () => {
  process.env.STUDIO_TEST_SECRET = 'do-not-leak';
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'test-key-not-real';
  root = await mkdtemp(path.join(os.tmpdir(), 'studio vite child '));
  await writeFile(path.join(root, 'index.html'), '<!doctype html><html><body><h1>child</h1></body></html>');
  await writeFile(path.join(root, 'vite.config.mjs'), CONFIG);
  manager = new ViteManager({ bus, vitePortBase: 46100, bridgeScript: async () => 'window.__bridgeLoaded = true;' });
});

afterAll(async () => {
  await manager.stopAll();
  delete process.env.STUDIO_TEST_SECRET;
  await rm(root, { recursive: true, force: true });
});

describe('ViteManager child process', { timeout: 60000 }, () => {
  it('runs the project vite.config in a child with a scrubbed env and serves the bridge', async () => {
    const target = { key: 'd:p:main', root, cacheDir: path.join(root, '.vite-cache'), projectId: 'p', directionId: 'main' };
    const url = await manager.url(target);
    const dump = JSON.parse(await readFile(path.join(root, 'env-dump.json'), 'utf8')) as { pid: number; ppid: number; keys: string[]; home: string };
    expect(dump.pid).not.toBe(process.pid);
    expect(dump.ppid).toBe(process.pid);
    expect(dump.pid).toBe(await manager.pid('d:p:main'));
    expect(dump.keys.filter((key) => key.startsWith('STUDIO_') || key.startsWith('ANTHROPIC_'))).toEqual([]);
    expect(dump.keys.filter((key) => !key.startsWith('npm_')).sort()).toEqual(expect.arrayContaining(['HOME', 'NODE_ENV', 'PATH']));
    expect(dump.home).not.toBe(os.homedir());

    const page = await (await fetch(url)).text();
    expect(page).toContain(BRIDGE_SCRIPT_PATH);
    expect(await (await fetch(new URL(BRIDGE_SCRIPT_PATH, url))).text()).toContain('__bridgeLoaded');
    expect(await manager.url(target)).toBe(url);
  });

  it('stops the child on stopOne', async () => {
    const pid = await manager.pid('d:p:main');
    await manager.stopOne('d:p:main');
    expect(pid).toBeDefined();
    expect(() => process.kill(pid!, 0)).toThrow();
  });
});
