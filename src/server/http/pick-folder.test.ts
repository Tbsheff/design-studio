import { realpathSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFakePreview } from '../agent/test-fakes.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, ServerConfig } from '../types.js';
import { createApp } from './app.js';
import { OSASCRIPT, createFolderPicker, type ExecFileFn, type FolderPicker } from './pick-folder.js';

type Call = { file: string; args: string[]; timeout: number };
type Reply = { error: (Error & { killed?: boolean; signal?: string }) | null; stdout?: string; stderr?: string };

let folder: string;
let calls: Call[];

function fakeExec(reply: Reply | (() => Promise<Reply>)): ExecFileFn {
  return (file, args, options, callback) => {
    calls.push({ file, args, timeout: options.timeout });
    const answer = typeof reply === 'function' ? reply() : Promise.resolve(reply);
    void answer.then((value) => callback(value.error, value.stdout ?? '', value.stderr ?? ''));
  };
}

function scriptArgs(call: Call | undefined): string[] {
  const args = call?.args ?? [];
  const lastScript = args.lastIndexOf('-e');
  return args.slice(lastScript + 2);
}

beforeEach(async () => {
  folder = realpathSync(await mkdtemp(path.join(os.tmpdir(), 'studio pick ')));
  calls = [];
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe('folder picker', () => {
  it('runs osascript by absolute path with argv, never a shell string', async () => {
    const picker = createFolderPicker({ platform: 'darwin', execFile: fakeExec({ error: null, stdout: `${folder}/\n` }) });
    const title = 'Pick "it"; do shell script "rm -rf ~"';
    expect(await picker.pick({ title, defaultPath: folder })).toEqual({ status: 'picked', path: folder });
    const [call] = calls;
    expect(call?.file).toBe(OSASCRIPT);
    expect(scriptArgs(call)).toEqual([title, folder]);
    expect(call?.args.filter((arg) => arg !== '-e').some((line) => line.includes(folder))).toBe(true);
    expect(call?.args.slice(0, -2).every((arg) => !arg.includes('rm -rf'))).toBe(true);
  });

  it('drops a default path that does not exist', async () => {
    const picker = createFolderPicker({ platform: 'darwin', execFile: fakeExec({ error: null, stdout: `${folder}/` }) });
    await picker.pick({ defaultPath: path.join(folder, 'missing') });
    expect(scriptArgs(calls[0])).toEqual(['Choose a folder']);
    await picker.pick({ defaultPath: 'relative' });
    expect(scriptArgs(calls[1])).toEqual(['Choose a folder']);
  });

  it('treats error -128 as cancel', async () => {
    const error = Object.assign(new Error('Command failed'), { code: 1 });
    const picker = createFolderPicker({ platform: 'darwin', execFile: fakeExec({ error, stderr: 'execution error: User canceled. (-128)' }) });
    expect(await picker.pick({})).toEqual({ status: 'canceled' });
  });

  it('reports a timeout when the process is killed', async () => {
    const error = Object.assign(new Error('Command failed'), { killed: true, signal: 'SIGTERM' });
    const picker = createFolderPicker({ platform: 'darwin', timeoutMs: 1234, execFile: fakeExec({ error }) });
    expect(await picker.pick({})).toEqual({ status: 'timeout' });
    expect(calls[0]?.timeout).toBe(1234);
  });

  it('is unsupported off macOS and never runs a process', async () => {
    const picker = createFolderPicker({ platform: 'linux', execFile: fakeExec({ error: null, stdout: folder }) });
    expect(await picker.pick({})).toEqual({ status: 'unsupported' });
    expect(calls).toEqual([]);
  });

  it('allows one dialog at a time', async () => {
    let finish: (reply: Reply) => void = () => undefined;
    const picker = createFolderPicker({ platform: 'darwin', execFile: fakeExec(() => new Promise<Reply>((resolve) => (finish = resolve))) });
    const first = picker.pick({});
    expect(await picker.pick({})).toEqual({ status: 'busy' });
    finish({ error: null, stdout: folder });
    expect(await first).toEqual({ status: 'picked', path: folder });
    expect(calls).toHaveLength(1);
  });

  it('fails when the picked folder is gone', async () => {
    const picker = createFolderPicker({ platform: 'darwin', execFile: fakeExec({ error: null, stdout: `${folder}/gone/` }) });
    expect(await picker.pick({})).toMatchObject({ status: 'failed' });
  });
});

describe('POST /api/pick-folder', () => {
  let config: ServerConfig;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ config, cleanup } = await makeTempConfig());
  });

  afterEach(async () => {
    await cleanup();
  });

  function appWith(folderPicker: FolderPicker) {
    const versions = createVersionStore(config);
    const runner: AgentRunner = { start: () => ({ runId: 'r', cancel: () => undefined, done: new Promise(() => undefined) }), get: () => undefined, isRunning: () => false };
    return createApp({ config, bus: createEventBus(config.dataDir), projects: createProjectStore(config, versions), versions, runner, preview: createFakePreview(), folderPicker });
  }

  function post(app: ReturnType<typeof createApp>, headers: Record<string, string> = {}, body: unknown = { title: 'Open a folder' }) {
    return Promise.resolve(app.request('/api/pick-folder', { method: 'POST', headers: { 'x-studio-token': config.studioToken, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }));
  }

  it('maps picker results to status codes', async () => {
    const picked = await post(appWith(createFolderPicker({ platform: 'darwin', execFile: fakeExec({ error: null, stdout: `${folder}/` }) })));
    expect(picked.status).toBe(200);
    expect(await picked.json()).toEqual({ path: folder });
    const canceled = await post(appWith(createFolderPicker({ platform: 'darwin', execFile: fakeExec({ error: new Error('x'), stderr: 'User canceled. (-128)' }) })));
    expect(canceled.status).toBe(204);
    expect(await canceled.text()).toBe('');
    expect((await post(appWith(createFolderPicker({ platform: 'win32' })))).status).toBe(501);
    const timedOut = await post(appWith(createFolderPicker({ platform: 'darwin', execFile: fakeExec({ error: Object.assign(new Error('x'), { killed: true }) }) })));
    expect(timedOut.status).toBe(504);
    expect((await post(appWith({ pick: async () => ({ status: 'busy' }) }))).status).toBe(409);
  });

  it('needs the token, the studio origin and a same-origin fetch', async () => {
    const picker: FolderPicker = { pick: async () => ({ status: 'picked', path: folder }) };
    const app = appWith(picker);
    const noToken = await Promise.resolve(app.request('/api/pick-folder', { method: 'POST', body: '{}' }));
    expect(noToken.status).toBe(403);
    expect((await post(app, { origin: 'http://evil.test' })).status).toBe(403);
    expect((await post(app, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect((await post(app, { origin: config.studioOrigin, 'sec-fetch-site': 'same-origin' })).status).toBe(200);
  });

  it('rejects a non-string default path', async () => {
    const app = appWith({ pick: async () => ({ status: 'canceled' }) });
    expect((await post(app, {}, { defaultPath: 7 })).status).toBe(400);
  });
});
