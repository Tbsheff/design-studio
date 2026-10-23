import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/contracts.js';
import type { ServerConfig, VersionStore } from '../types.js';
import { createEventBus } from './events.js';
import { createProjectStore, type StudioProjectStore } from './projects.js';
import { makeTempConfig } from './testConfig.js';
import { createVersionStore } from './versions.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let versions: VersionStore;
let projects: StudioProjectStore;
let installCalls: number;

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  versions = createVersionStore(config);
  installCalls = 0;
  projects = createProjectStore(config, versions, {
    installTemplateDeps: async (cacheDir) => {
      installCalls += 1;
      await mkdir(path.join(cacheDir, 'node_modules', 'react'), { recursive: true });
    },
  });
});

afterEach(async () => {
  await cleanup();
});

describe('project store', () => {
  it('creates an html project with the documented layout', async () => {
    const project = await projects.create({ name: 'Landing', kind: 'html' });
    expect(project.id).toHaveLength(10);
    expect(project.entry).toBe('index.html');
    expect(project.settings).toEqual(DEFAULT_SETTINGS);
    const [main] = project.directions;
    expect(main?.id).toBe('main');
    expect(main?.branch).toBe('d/main');
    expect(main?.workTree).toBe(path.join(config.dataDir, 'projects', project.id, 'directions', 'main'));
    expect(existsSync(main!.workTree)).toBe(true);
    expect(await projects.get(project.id)).toEqual(project);
    expect((await projects.list()).map((item) => item.id)).toEqual([project.id]);
    const files = await readdir(projects.projectDir(project.id));
    expect(files.filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('creates react projects from the template with one shared install', async () => {
    const first = await projects.create({ name: 'A', kind: 'react' });
    const second = await projects.create({ name: 'B', kind: 'react' });
    expect(installCalls).toBe(1);
    for (const project of [first, second]) {
      const workTree = project.directions[0]!.workTree;
      expect(existsSync(path.join(workTree, 'src/App.tsx'))).toBe(true);
      expect(lstatSync(path.join(workTree, 'node_modules')).isSymbolicLink()).toBe(true);
      expect(realpathSync(path.join(workTree, 'node_modules'))).toBe(
        realpathSync(path.join(config.dataDir, 'cache', 'react-template', 'node_modules')),
      );
    }
  });

  it('imports a folder without writing into it and detects the kind', async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), 'studio import '));
    try {
      await writeFile(path.join(folder, 'index.html'), '<h1>hi</h1>');
      const project = await projects.importFolder(folder);
      expect(project.kind).toBe('html');
      expect(project.directions[0]?.workTree).toBe(realpathSync(folder));
      expect(project.imported).toEqual({ sourcePath: realpathSync(folder) });
      expect(await readdir(folder)).toEqual(['index.html']);

      await writeFile(path.join(folder, 'package.json'), JSON.stringify({ devDependencies: { vite: '^7.0.0' } }));
      expect((await projects.importFolder(folder)).kind).toBe('react');

      const empty = await mkdtemp(path.join(os.tmpdir(), 'studio empty '));
      await expect(projects.importFolder(empty)).rejects.toThrow(/vite dependency or an index.html/);
      await rm(empty, { recursive: true, force: true });
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });

  it('stores attachments and DESIGN.md', async () => {
    const project = await projects.create({ name: 'Files', kind: 'html' });
    const attachment = await projects.saveAttachment(project.id, {
      name: 'shot.png',
      mime: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect(attachment.path).toBe(path.join(projects.projectDir(project.id), 'attachments', `${attachment.id}.png`));
    expect(await projects.getAttachment(project.id, attachment.id)).toEqual(attachment);
    expect([...(await readFile(attachment.path))]).toEqual([1, 2, 3]);

    expect(await projects.readDesignMd(project.id)).toBeNull();
    await projects.writeDesignMd(project.id, '# Brand\n');
    expect(await projects.readDesignMd(project.id)).toBe('# Brand\n');
    expect(await readFile(path.join(project.directions[0]!.workTree, 'DESIGN.md'), 'utf8')).toBe('# Brand\n');
  });

  it('updates directions atomically and rejects unsafe ids', async () => {
    const project = await projects.create({ name: 'Ids', kind: 'html' });
    const updated = await projects.updateDirection(project.id, 'main', { headVersionId: 'abc', branch: 'evil' });
    expect(updated.headVersionId).toBe('abc');
    expect(updated.branch).toBe('d/main');
    await expect(projects.get('../outside')).rejects.toThrow(/invalid/);
    await expect(projects.get('missing123')).rejects.toThrow(/not found/);
  });

  it('reads the old $2 default budget as no limit once, and keeps custom and later-set limits', async () => {
    const project = await projects.create({ name: 'Budget', kind: 'html' });
    expect(project.settings.maxBudgetUsd).toBeNull();
    const file = path.join(projects.projectDir(project.id), 'project.json');
    const legacy = async (maxBudgetUsd: number) => {
      const stored = JSON.parse(await readFile(file, 'utf8'));
      delete stored.settingsVersion;
      stored.settings.maxBudgetUsd = maxBudgetUsd;
      await writeFile(file, JSON.stringify(stored));
    };
    await legacy(2);
    expect((await projects.get(project.id)).settings.maxBudgetUsd).toBeNull();
    await legacy(0.75);
    expect((await projects.get(project.id)).settings.maxBudgetUsd).toBe(0.75);
    await legacy(2);
    await projects.updateSettings(project.id, { maxTurns: 9 });
    expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject({ settingsVersion: 2, settings: { maxBudgetUsd: null, maxTurns: 9 } });
    await projects.updateSettings(project.id, { maxBudgetUsd: 2 });
    expect((await projects.get(project.id)).settings.maxBudgetUsd).toBe(2);
  });
});

describe('event bus', () => {
  it('keeps seq across a new bus instance and replays from the file', () => {
    const bus = createEventBus(config.dataDir);
    const received: number[] = [];
    const unsubscribe = bus.subscribe('p1', (event) => received.push(event.seq));
    bus.emit({ type: 'files.changed', projectId: 'p1', paths: ['a'], changedAt: 1 });
    bus.emit({ type: 'files.changed', projectId: 'p1', paths: ['b'], changedAt: 2 });
    bus.emit({ type: 'status.changed', projectId: 'p2', status: { dirty: false, changed: [] } });
    unsubscribe();
    bus.emit({ type: 'files.changed', projectId: 'p1', paths: ['c'], changedAt: 3 });
    expect(received).toEqual([1, 2]);

    const restarted = createEventBus(config.dataDir);
    expect(restarted.since('p1', 1).map((event) => event.seq)).toEqual([2, 3]);
    const next = restarted.emit({ type: 'files.changed', projectId: 'p1', paths: ['d'], changedAt: 4 });
    expect(next.seq).toBe(4);
    expect(restarted.emit({ type: 'files.changed', projectId: 'p2', paths: [], changedAt: 5 }).seq).toBe(2);
    expect(restarted.since('p1', 0)).toHaveLength(4);
  });
});
