import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CommentTarget, StudioEvent } from '../../shared/contracts.js';
import { createCommentStore, reorderSubset, type CommentStore } from './comments.js';
import { createEventBus } from './events.js';

const target: CommentTarget = {
  selector: 'body > h1',
  sourceLoc: { file: 'index.html', line: 4, col: 5 },
  tag: 'h1',
  textSnippet: 'Hi',
  rectHint: { x: 0, y: 0, width: 10, height: 10 },
};

let dataDir: string;
let store: CommentStore;
let events: StudioEvent[];

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), 'studio comments '));
  const bus = createEventBus(dataDir);
  events = [];
  bus.subscribe('p1', (event) => events.push(event));
  store = createCommentStore(dataDir, bus);
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe('comment store', () => {
  it('stores comments per direction in the data dir, not the work tree', async () => {
    const created = await store.create('p1', 'main', { text: 'Bigger', target });
    expect(created).toMatchObject({ n: 1, status: 'queued', text: 'Bigger' });
    const file = path.join(dataDir, 'projects', 'p1', 'comments', 'main.json');
    expect(existsSync(file)).toBe(true);
    expect(JSON.parse(await readFile(file, 'utf8')).comments).toHaveLength(1);
    expect(await store.list('p1', 'other')).toEqual([]);
    expect(events.at(-1)).toMatchObject({ type: 'comments.changed', directionId: 'main' });
  });

  it('gives stable increasing numbers that are not reused after delete', async () => {
    const a = await store.create('p1', 'main', { text: 'A', target });
    await store.create('p1', 'main', { text: 'B', target });
    await store.remove('p1', 'main', a.id);
    const c = await store.create('p1', 'main', { text: 'C', target });
    expect(c.n).toBe(3);
  });

  it('rejects ids that could escape the data dir', async () => {
    await expect(store.list('p1', '../x')).rejects.toThrow(/invalid directionId/);
  });

  it('sends, then resolves with the version on a completed run', async () => {
    const a = await store.create('p1', 'main', { text: 'A', target });
    const b = await store.create('p1', 'main', { text: 'B', target, status: 'draft' });
    await store.markSent('p1', 'main', [a.id, b.id], 'run1');
    expect((await store.list('p1', 'main')).map((c) => [c.status, c.runId])).toEqual([
      ['sent', 'run1'],
      ['sent', 'run1'],
    ]);
    await store.finishRun('p1', 'main', { runId: 'other', status: 'completed', versionId: 'v0' });
    expect((await store.list('p1', 'main')).every((c) => c.status === 'sent')).toBe(true);
    await store.finishRun('p1', 'main', { runId: 'run1', status: 'completed', versionId: 'v1' });
    expect((await store.list('p1', 'main')).map((c) => [c.status, c.versionId])).toEqual([
      ['resolved', 'v1'],
      ['resolved', 'v1'],
    ]);
  });

  it('returns comments to the queue when the run fails or is canceled', async () => {
    const a = await store.create('p1', 'main', { text: 'A', target });
    await store.markSent('p1', 'main', [a.id], 'run1');
    await store.finishRun('p1', 'main', { runId: 'run1', status: 'canceled', versionId: null });
    const [after] = await store.list('p1', 'main');
    expect(after?.status).toBe('queued');
    expect(after?.runId).toBeUndefined();
  });

  it('blocks invalid user transitions', async () => {
    const a = await store.create('p1', 'main', { text: 'A', target });
    await expect(store.update('p1', 'main', a.id, { status: 'sent' })).rejects.toThrow(/bad_transition/);
    await store.markSent('p1', 'main', [a.id], 'run1');
    await expect(store.update('p1', 'main', a.id, { status: 'orphaned' })).rejects.toThrow(/bad_transition/);
    await expect(store.markSent('p1', 'main', [a.id], 'run2')).rejects.toThrow(/bad_transition/);
  });

  it('re-pins an orphan with a new target', async () => {
    const a = await store.create('p1', 'main', { text: 'A', target });
    await store.update('p1', 'main', a.id, { status: 'orphaned' });
    const moved = await store.update('p1', 'main', a.id, { status: 'queued', target: { ...target, selector: 'main > h2', tag: 'h2' } });
    expect(moved).toMatchObject({ status: 'queued', target: { selector: 'main > h2', tag: 'h2' } });
  });

  it('moves drafts to the queue on requeue and leaves others', async () => {
    const a = await store.create('p1', 'main', { text: 'A', target, status: 'draft' });
    const b = await store.create('p1', 'main', { text: 'B', target });
    await store.requeue('p1', 'main', [a.id, b.id]);
    expect((await store.list('p1', 'main')).map((c) => c.status)).toEqual(['queued', 'queued']);
  });

  it('reorders only the given ids and keeps the others in place', async () => {
    const items = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
    expect(reorderSubset(items, ['d', 'b']).map((i) => i.id)).toEqual(['a', 'd', 'c', 'b']);
    expect(() => reorderSubset(items, ['a', 'a'])).toThrow(/unique/);
    expect(() => reorderSubset(items, ['z'])).toThrow(/not found/);
  });

  it('writes nothing and emits nothing when a change is a no-op', async () => {
    const a = await store.create('p1', 'main', { text: 'A', target });
    const count = events.length;
    await store.finishRun('p1', 'main', { runId: 'nope', status: 'completed', versionId: null });
    expect(events.length).toBe(count);
    expect(a.status).toBe('queued');
  });
});
