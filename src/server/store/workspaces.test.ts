import { realpathSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WORKSPACES_FILE, createWorkspaceStore, type WorkspaceStore } from './workspaces.js';

let dataDir: string;
let outside: string;
let store: WorkspaceStore;

beforeEach(async () => {
  dataDir = realpathSync(await mkdtemp(path.join(os.tmpdir(), 'studio ws data ')));
  outside = realpathSync(await mkdtemp(path.join(os.tmpdir(), 'studio ws user ')));
  store = createWorkspaceStore(dataDir, { homeDir: '/Users/tester' });
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

describe('workspace store', () => {
  it('starts empty and reports the home dir', async () => {
    expect(await store.list()).toEqual({ homeDir: '/Users/tester', folders: [] });
  });

  it('adds a folder by realpath, labels it with the folder name, and de-dupes', async () => {
    const real = path.join(outside, 'Client Work');
    await mkdir(real);
    const link = path.join(outside, 'link');
    await symlink(real, link, 'dir');
    const added = await store.add({ path: link });
    expect(added).toMatchObject({ path: real, label: 'Client Work', missing: false });
    expect(await store.add({ path: `${real}/` })).toEqual(added);
    expect((await store.list()).folders).toHaveLength(1);
    const saved = JSON.parse(await readFile(path.join(dataDir, WORKSPACES_FILE), 'utf8')) as { version: number; folders: unknown[] };
    expect(saved.version).toBe(1);
    expect(saved.folders).toHaveLength(1);
  });

  it('refuses relative, missing, file and data-dir paths', async () => {
    await writeFile(path.join(outside, 'file.txt'), 'x');
    await expect(store.add({ path: 'relative/dir' })).rejects.toThrow(/absolute/);
    await expect(store.add({ path: path.join(outside, 'nope') })).rejects.toThrow(/not found/);
    await expect(store.add({ path: path.join(outside, 'file.txt') })).rejects.toThrow(/not a folder/);
    await expect(store.add({ path: dataDir })).rejects.toThrow(/data dir/);
    await expect(store.add({ path: `${outside}\0x` })).rejects.toThrow(/invalid path/);
  });

  it('renames and removes without touching the folder on disk', async () => {
    const added = await store.add({ path: outside, label: 'Mine' });
    expect(added.label).toBe('Mine');
    expect((await store.rename(added.id, '  Sites  ')).label).toBe('Sites');
    await expect(store.rename(added.id, '   ')).rejects.toThrow(/label is required/);
    await expect(store.rename(added.id, 'x'.repeat(81))).rejects.toThrow(/80 characters/);
    await expect(store.rename('../evil', 'x')).rejects.toThrow(/invalid workspaceId/);
    await store.remove(added.id);
    expect((await store.list()).folders).toEqual([]);
    await expect(store.remove(added.id)).rejects.toThrow(/not found/);
    expect(realpathSync(outside)).toBe(outside);
  });

  it('shows a moved folder as missing', async () => {
    const folder = path.join(outside, 'moved');
    await mkdir(folder);
    const added = await store.add({ path: folder });
    await rename(folder, path.join(outside, 'moved-away'));
    const [listed] = (await store.list()).folders;
    expect(listed).toMatchObject({ id: added.id, missing: true });
  });

  it('keeps only valid entries from a hand-edited file', async () => {
    const good = { id: 'abc123', path: outside, label: 'Good', addedAt: 1 };
    const bad = [{ id: 'x', path: 'relative', label: 'Bad', addedAt: 1 }, { id: '../', path: outside, label: 'Bad', addedAt: 1 }, 'nope'];
    await writeFile(path.join(dataDir, WORKSPACES_FILE), JSON.stringify({ version: 1, folders: [good, ...bad] }));
    expect((await store.list()).folders.map((folder) => folder.id)).toEqual(['abc123']);
    await writeFile(path.join(dataDir, WORKSPACES_FILE), '{not json');
    expect((await store.list()).folders).toEqual([]);
  });

  it('serializes concurrent adds', async () => {
    const dirs = await Promise.all(['a', 'b', 'c', 'd'].map(async (name) => {
      const dir = path.join(outside, name);
      await mkdir(dir);
      return dir;
    }));
    await Promise.all(dirs.map((dir) => store.add({ path: dir })));
    expect((await store.list()).folders.map((folder) => folder.label).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
