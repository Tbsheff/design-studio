import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultFolderStore, projectsDirFromEnv, PREFERENCES_FILE } from './default-folder.js';
import { createWorkspaceStore } from './workspaces.js';

let root: string;
let dataDir: string;
let fallback: string;

beforeEach(async () => {
  root = realpathSync(await mkdtemp(path.join(os.tmpdir(), 'studio default folder ')));
  dataDir = path.join(root, 'data');
  fallback = path.join(root, 'Design Studio');
  await mkdir(dataDir);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('default projects folder', () => {
  it('takes the env var, then the dev folder, then ~/Design Studio', () => {
    expect(projectsDirFromEnv('/tmp/elsewhere/', '/Users/me', '/repo')).toBe('/tmp/elsewhere');
    expect(projectsDirFromEnv(undefined, '/Users/me', '/repo')).toBe('/repo/studio-projects');
    expect(projectsDirFromEnv(undefined, '/Users/me', null)).toBe('/Users/me/Design Studio');
    expect(projectsDirFromEnv('', '/Users/me', null)).toBe('/Users/me/Design Studio');
    expect(projectsDirFromEnv('relative/dir', '/Users/me', null)).toBe('/Users/me/Design Studio');
  });

  it('puts a saved setting before the env fallback', async () => {
    const store = createDefaultFolderStore(dataDir, fallback);
    expect(await store.current()).toBe(fallback);
    const chosen = path.join(root, 'chosen');
    await mkdir(chosen);
    expect(await store.set(chosen)).toBe(chosen);
    expect(await store.current()).toBe(chosen);
    expect(await createDefaultFolderStore(dataDir, fallback).current()).toBe(chosen);
    expect(JSON.parse(readFileSync(path.join(dataDir, PREFERENCES_FILE), 'utf8'))).toEqual({ version: 1, projectsDir: chosen });
  });

  it('ignores a broken settings file', async () => {
    await writeFile(path.join(dataDir, PREFERENCES_FILE), '{"version":1,"projectsDir":"relative"}');
    expect(await createDefaultFolderStore(dataDir, fallback).current()).toBe(fallback);
    await writeFile(path.join(dataDir, PREFERENCES_FILE), 'not json');
    expect(await createDefaultFolderStore(dataDir, fallback).current()).toBe(fallback);
  });

  it('validates a new default like other folder inputs', async () => {
    const store = createDefaultFolderStore(dataDir, fallback);
    await writeFile(path.join(root, 'file.txt'), 'x');
    for (const bad of ['', 'relative/dir', path.join(root, 'missing'), path.join(root, 'file.txt'), dataDir, path.join(dataDir, 'projects'), `${root}\0x`]) {
      if (bad === path.join(dataDir, 'projects')) await mkdir(bad, { recursive: true });
      await expect(store.set(bad), bad).rejects.toThrow();
    }
    expect(existsSync(path.join(dataDir, PREFERENCES_FILE))).toBe(false);
  });

  it('creates the folder only when asked', async () => {
    const store = createDefaultFolderStore(dataDir, fallback);
    await store.current();
    expect(existsSync(fallback)).toBe(false);
    expect(await store.ensure()).toBe(fallback);
    expect(existsSync(fallback)).toBe(true);
    await expect(createDefaultFolderStore(dataDir, path.join(dataDir, 'inside')).ensure()).rejects.toThrow(/data dir/);
  });

  it('shows the default first in the folder list and hides a saved copy of it', async () => {
    const defaultFolder = createDefaultFolderStore(dataDir, fallback);
    const workspaces = createWorkspaceStore(dataDir, { homeDir: root, defaultFolder });
    await defaultFolder.ensure();
    await workspaces.add({ path: fallback });
    const other = path.join(root, 'other');
    await mkdir(other);
    await workspaces.add({ path: other });
    const list = await workspaces.list();
    expect(list.folders.map((folder) => [folder.label, folder.path, folder.default ?? false])).toEqual([
      ['Design Studio', fallback, true],
      ['other', other, false],
    ]);
    await expect(workspaces.remove('default')).rejects.toThrow(/default folder/);
    await expect(workspaces.rename('default', 'x')).rejects.toThrow(/default folder/);
  });
});
