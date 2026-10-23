import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '../../shared/contracts.js';
import type { ServerConfig } from '../types.js';
import { createProjectStore, type StudioProjectStore } from './projects.js';
import { makeTempConfig } from './testConfig.js';
import { GIT_EXCLUDES, createVersionStore } from './versions.js';
import type { VersionStore } from '../types.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let versions: VersionStore;
let projects: StudioProjectStore;
let project: Project;

async function write(dir: string, file: string, content: string): Promise<void> {
  await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
  await writeFile(path.join(dir, file), content);
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  project = await projects.create({ name: 'Test', kind: 'html' });
  await versions.ensureRepo(project);
});

afterEach(async () => {
  await cleanup();
});

describe('version store', { timeout: 20000 }, () => {
  it('commits, lists newest first, and reports changed files', async () => {
    const main = projects.mainDirection(project);
    await write(main.workTree, 'index.html', '<h1>one</h1>');
    const first = await versions.commit(project, main, 'First', { kind: 'run', runId: 'r1' });
    expect(first).not.toBeNull();
    expect(first?.parentId).toBeNull();
    expect(first?.changedFiles).toEqual(['index.html']);
    expect(first?.directionId).toBe('main');
    expect(first?.meta).toEqual({ kind: 'run', runId: 'r1', directionId: 'main' });

    expect(await versions.commit(project, main, 'Nothing', { kind: 'run' })).toBeNull();

    await write(main.workTree, 'style.css', 'h1{}');
    await write(main.workTree, 'node_modules/x/index.js', 'ignored');
    const second = await versions.commit(project, main, 'Second', { kind: 'run' });
    expect(second?.parentId).toBe(first?.id);
    expect(second?.changedFiles).toEqual(['style.css']);

    const list = await versions.list(project, main);
    expect(list.map((version) => version.title)).toEqual(['Second', 'First']);
    expect((await versions.get(project, first!.id)).title).toBe('First');
  });

  it('undo creates a new version with the old tree and restore brings the undone version back', async () => {
    const main = projects.mainDirection(project);
    await write(main.workTree, 'index.html', 'v1');
    const v1 = await versions.commit(project, main, 'v1', { kind: 'run' });
    await write(main.workTree, 'index.html', 'v2');
    await write(main.workTree, 'extra.html', 'extra');
    const v2 = await versions.commit(project, main, 'v2', { kind: 'run' });

    const undo = await versions.restore(project, main, v2!.id, 'undo');
    expect(undo.meta).toEqual({ kind: 'undo', restoredFrom: v1!.id, directionId: 'main' });
    expect(undo.parentId).toBe(v2!.id);
    expect(await readFile(path.join(main.workTree, 'index.html'), 'utf8')).toBe('v1');
    expect(existsSync(path.join(main.workTree, 'extra.html'))).toBe(false);

    const list = await versions.list(project, main);
    expect(list.map((version) => version.id)).toEqual([undo.id, v2!.id, v1!.id]);

    const restored = await versions.restore(project, main, v2!.id, 'restore');
    expect(restored.meta).toEqual({ kind: 'restore', restoredFrom: v2!.id, directionId: 'main' });
    expect(await readFile(path.join(main.workTree, 'index.html'), 'utf8')).toBe('v2');
    expect(await readFile(path.join(main.workTree, 'extra.html'), 'utf8')).toBe('extra');
  });

  it('undo and restore titles name the original version and never nest', async () => {
    const main = projects.mainDirection(project);
    await write(main.workTree, 'index.html', 'v1');
    const v1 = await versions.commit(project, main, 'Bookshop landing', { kind: 'run' });
    await write(main.workTree, 'index.html', 'v2');
    await versions.commit(project, main, 'Edit h1: color', { kind: 'manual' });
    const undo = await versions.restore(project, main, 'head', 'undo');
    expect(undo.title).toBe('Back to Bookshop landing');
    await write(main.workTree, 'index.html', 'v3');
    await versions.commit(project, main, 'Update tokens: --primary', { kind: 'manual' });
    const undoAgain = await versions.restore(project, main, 'head', 'undo');
    expect(undoAgain.title).toBe('Back to Bookshop landing');
    const restored = await versions.restore(project, main, undo.id, 'restore');
    expect(restored.title).toBe('Restored Bookshop landing');
    expect(restored.meta.restoredFrom).toBe(undo.id);
    const redo = await versions.restore(project, main, 'head', 'undo');
    expect(redo.title).toBe('Back to Bookshop landing');
    expect(v1).not.toBeNull();
  });

  it('reports status after manual writes and discard resets to head', async () => {
    const main = projects.mainDirection(project);
    await write(main.workTree, 'index.html', 'clean');
    await versions.commit(project, main, 'base', { kind: 'run' });
    expect(await versions.status(project, main)).toEqual({ dirty: false, changed: [] });

    await write(main.workTree, 'index.html', 'dirty');
    await write(main.workTree, 'new/page.html', 'new');
    await write(main.workTree, '.DS_Store', 'junk');
    const status = await versions.status(project, main);
    expect(status.dirty).toBe(true);
    expect(status.changed.sort()).toEqual(['index.html', 'new/page.html']);

    const after = await versions.discard(project, main);
    expect(after).toEqual({ dirty: false, changed: [] });
    expect(await readFile(path.join(main.workTree, 'index.html'), 'utf8')).toBe('clean');
    expect(existsSync(path.join(main.workTree, 'new/page.html'))).toBe(false);
    expect(existsSync(path.join(main.workTree, '.DS_Store'))).toBe(true);
  });

  it('keeps directions isolated from each other', async () => {
    const main = projects.mainDirection(project);
    await write(main.workTree, 'index.html', 'base');
    const base = await versions.commit(project, main, 'base', { kind: 'run' });
    await projects.updateDirection(project.id, 'main', { headVersionId: base!.id });

    const branch = await projects.addDirection(project.id, { name: 'Alt', fromVersionId: base!.id });
    project = await projects.get(project.id);
    expect(branch.parentVersionId).toBe(base!.id);
    expect(await readFile(path.join(branch.workTree, 'index.html'), 'utf8')).toBe('base');
    const fork = await versions.commit(project, branch, 'Fork', { kind: 'fork' });
    expect(fork?.parentId).toBe(base!.id);
    expect(fork?.directionId).toBe(branch.id);

    await write(branch.workTree, 'index.html', 'alt');
    await write(branch.workTree, 'alt.html', 'alt only');
    const altVersion = await versions.commit(project, branch, 'alt change', { kind: 'run' });
    await write(main.workTree, 'main.html', 'main only');

    expect(await versions.status(project, main)).toEqual({ dirty: true, changed: ['main.html'] });
    expect(await versions.status(project, branch)).toEqual({ dirty: false, changed: [] });
    expect(await readFile(path.join(main.workTree, 'index.html'), 'utf8')).toBe('base');
    expect(existsSync(path.join(main.workTree, 'alt.html'))).toBe(false);

    expect((await versions.list(project, main)).map((version) => version.id)).toEqual([base!.id]);
    expect((await versions.list(project, branch)).map((version) => version.id)).toEqual([altVersion!.id, fork!.id]);
  });

  it('checks a version out into another folder, snapshots it, and exports a zip', async () => {
    const main = projects.mainDirection(project);
    await write(main.workTree, 'index.html', '<p>export me</p>');
    await write(main.workTree, 'assets/a.css', 'p{}');
    const version = await versions.commit(project, main, 'export', { kind: 'run' });
    await write(main.workTree, 'index.html', 'later edit');

    const target = await mkdtemp(path.join(os.tmpdir(), 'studio checkout '));
    try {
      await versions.checkoutInto(project, version!.id, target);
      expect(await readFile(path.join(target, 'index.html'), 'utf8')).toBe('<p>export me</p>');
      expect(await readFile(path.join(target, 'assets/a.css'), 'utf8')).toBe('p{}');
    } finally {
      await rm(target, { recursive: true, force: true });
    }

    const snapshotDir = await versions.snapshot(project, version!.id);
    expect(snapshotDir).toBe(path.join(projects.projectDir(project.id), 'snapshots', version!.id));
    expect(await readFile(path.join(snapshotDir, 'index.html'), 'utf8')).toBe('<p>export me</p>');
    expect(await versions.snapshot(project, version!.id)).toBe(snapshotDir);

    const zip = await versions.exportZip(project, version!.id);
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    const text = Buffer.from(zip).toString('latin1');
    expect(text).toContain('index.html');
    expect(text).toContain('assets/a.css');
  });

  it('rejects unknown version ids', async () => {
    await expect(versions.get(project, 'f'.repeat(40))).rejects.toThrow(/not found/);
    await expect(versions.get(project, '../etc')).rejects.toThrow(/invalid/);
  });
  it('restore and undo keep files the user added that no version tracks', async () => {
    const main = projects.mainDirection(project);
    await write(main.workTree, 'index.html', 'v1');
    const v1 = await versions.commit(project, main, 'v1', { kind: 'run' });
    await write(main.workTree, 'index.html', 'v2');
    const v2 = await versions.commit(project, main, 'v2', { kind: 'run' });
    await write(main.workTree, 'user-notes.txt', 'mine');
    await write(main.workTree, 'notes/deep.md', 'deep');
    expect((await versions.status(project, main)).changed.sort()).toEqual(['notes/deep.md', 'user-notes.txt']);

    await versions.restore(project, main, v2!.id, 'undo');
    expect(await readFile(path.join(main.workTree, 'index.html'), 'utf8')).toBe('v1');
    expect(await readFile(path.join(main.workTree, 'user-notes.txt'), 'utf8')).toBe('mine');
    expect(await readFile(path.join(main.workTree, 'notes/deep.md'), 'utf8')).toBe('deep');

    await versions.restore(project, main, v1!.id, 'restore');
    expect(await readFile(path.join(main.workTree, 'user-notes.txt'), 'utf8')).toBe('mine');
    expect((await versions.status(project, main)).changed.sort()).toEqual(['notes/deep.md', 'user-notes.txt']);
  });

  it('discard moves new untracked files to the project trash instead of deleting them', async () => {
    const main = projects.mainDirection(project);
    await write(main.workTree, 'index.html', 'clean');
    await versions.commit(project, main, 'base', { kind: 'run' });
    await write(main.workTree, 'index.html', 'dirty');
    await write(main.workTree, 'stray/note.txt', 'keep me somewhere');
    await versions.status(project, main);

    expect(await versions.discard(project, main)).toEqual({ dirty: false, changed: [] });
    expect(existsSync(path.join(main.workTree, 'stray/note.txt'))).toBe(false);
    const trashRoot = path.join(projects.projectDir(project.id), 'trash');
    const [stamp] = await readdir(trashRoot);
    expect(await readFile(path.join(trashRoot, stamp!, 'stray/note.txt'), 'utf8')).toBe('keep me somewhere');
    expect(await readFile(path.join(main.workTree, 'index.html'), 'utf8')).toBe('clean');
  });

  it('never commits or exports a node_modules symlink, even from an old exclude file', async () => {
    const main = projects.mainDirection(project);
    expect(GIT_EXCLUDES).toContain('node_modules');
    const modules = await mkdtemp(path.join(os.tmpdir(), 'studio-modules-'));
    try {
      await writeFile(path.join(projects.projectDir(project.id), 'git', 'info', 'exclude'), 'node_modules/\n');
      const fresh = createVersionStore(config);
      await symlink(modules, path.join(main.workTree, 'node_modules'), 'dir');
      await write(main.workTree, 'index.html', 'x');
      const version = await fresh.commit(project, main, 'with link', { kind: 'run' });
      expect(version?.changedFiles).toEqual(['index.html']);
      const exclude = await readFile(path.join(projects.projectDir(project.id), 'git', 'info', 'exclude'), 'utf8');
      expect(exclude.split('\n')).toContain('node_modules');
      const zip = Buffer.from(await fresh.exportZip(project, version!.id)).toString('latin1');
      expect(zip).toContain('index.html');
      expect(zip).not.toContain('node_modules');
    } finally {
      await rm(modules, { recursive: true, force: true });
    }
  });

  it('status with paths stages only those paths', async () => {
    const main = projects.mainDirection(project);
    await write(main.workTree, 'index.html', 'base');
    await versions.commit(project, main, 'base', { kind: 'run' });
    await write(main.workTree, 'a.html', 'a');
    await write(main.workTree, 'b.html', 'b');
    expect(await versions.status(project, main, ['a.html'])).toEqual({ dirty: true, changed: ['a.html'] });
    expect(await versions.status(project, main, ['gone.html', 'node_modules'])).toEqual({ dirty: true, changed: ['a.html', 'b.html'] });
    expect((await versions.status(project, main, [])).changed).toEqual(['a.html', 'b.html']);
    expect((await versions.status(project, main)).changed).toEqual(['a.html', 'b.html']);
  });

  it('commitFile commits one file and leaves other unfinished changes alone', async () => {
    const main = projects.mainDirection(project);
    await write(main.workTree, 'index.html', 'base');
    const base = await versions.commit(project, main, 'base', { kind: 'run' });
    await write(main.workTree, 'index.html', 'partial run');
    await write(main.workTree, 'DESIGN.md', '# Tokens');
    const version = await versions.commitFile(project, main, 'DESIGN.md', 'Update DESIGN.md', { kind: 'manual' });
    expect(version?.parentId).toBe(base!.id);
    expect(version?.changedFiles).toEqual(['DESIGN.md']);
    expect(version?.meta.kind).toBe('manual');
    expect(await versions.status(project, main)).toEqual({ dirty: true, changed: ['index.html'] });
    expect(await versions.commitFile(project, main, 'DESIGN.md', 'again', { kind: 'manual' })).toBeNull();
  });
});
