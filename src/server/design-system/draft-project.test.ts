import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { DesignSystemCoverage } from '../../shared/contracts.js';
import { TOKENS_FILE } from '../../shared/contracts.js';
import { draftAttachmentIds, readCoverage, refreshDraftCoverage } from './draft-project.js';
import { buildDraft, COVERAGE_FILE, META_FILE, parseDraftRequest } from './extract/draft.js';
import { packRegistry } from './packs.js';

const roots: string[] = [];

afterEach(async () => {
  while (roots.length) await rm(roots.pop() as string, { recursive: true, force: true });
});

const noFetch = async () => Promise.reject(new Error('no network in tests'));

async function draftTree(request: Record<string, unknown>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'studio-draft-'));
  roots.push(root);
  const draft = await buildDraft(parseDraftRequest(request, 0), { registry: packRegistry(), fetcher: noFetch }, { allowLoopback: false, imageCount: 0 });
  await mkdir(path.join(root, 'design-system'), { recursive: true });
  await mkdir(path.join(root, 'source'), { recursive: true });
  await writeFile(path.join(root, TOKENS_FILE), `${JSON.stringify(draft.pack.tokensJson, null, 2)}\n`);
  await writeFile(path.join(root, COVERAGE_FILE), `${JSON.stringify(draft.coverage, null, 2)}\n`);
  return { root, coverage: draft.coverage };
}

type Tokens = Record<string, Record<string, { $value: string; $extensions?: Record<string, unknown> }>>;

async function editTokens(root: string, edit: (tokens: Tokens) => void): Promise<void> {
  const tokens = JSON.parse(await readFile(path.join(root, TOKENS_FILE), 'utf8')) as Tokens;
  edit(tokens);
  await writeFile(path.join(root, TOKENS_FILE), JSON.stringify(tokens));
}

describe('draft coverage after a run', () => {
  it('marks fallback tokens the run changed as set by the agent, rescores and rewrites coverage.json', async () => {
    const { root, coverage } = await draftTree({ brief: 'Quiet tools for focused teams' });
    expect(coverage.fallbacks).toEqual(expect.arrayContaining(['radius.pill', 'shadow.lg', 'color.success']));
    await editTokens(root, (tokens) => {
      tokens['radius']!['pill']!.$value = '999px';
      tokens['color']!['success']!.$extensions = { 'studio.modes': { dark: 'oklch(70% 0.15 150)' } };
    });
    const next = (await refreshDraftCoverage(root, packRegistry())) as DesignSystemCoverage;
    const entry = (token: string) => next.tokens.find((item) => item.token === token);
    expect(entry('radius.pill')).toEqual({ token: 'radius.pill', source: 'agent', confidence: 'medium', evidence: 'changed by an Improve with AI run' });
    expect(entry('color.success')).toMatchObject({ source: 'agent' });
    expect(entry('shadow.lg')).toMatchObject({ source: 'base', confidence: 'fallback' });
    expect(next.fallbacks).not.toContain('radius.pill');
    expect(next.fallbacks).toContain('shadow.lg');
    expect(next.score).toBeGreaterThan(coverage.score);
    expect(await readCoverage(root)).toEqual(next);
  });

  it('leaves coverage.json alone when no fallback token changed', async () => {
    const { root, coverage } = await draftTree({ brief: 'Quiet tools' });
    const before = (await stat(path.join(root, COVERAGE_FILE))).mtimeMs;
    expect(await refreshDraftCoverage(root, packRegistry())).toEqual(coverage);
    expect((await stat(path.join(root, COVERAGE_FILE))).mtimeMs).toBe(before);
  });

  it('compares a dark draft made from a light base with the base dark values', async () => {
    const { root, coverage } = await draftTree({ brief: 'Night mode console', mode: 'dark' });
    expect(coverage.mode).toBe('dark');
    expect(await refreshDraftCoverage(root, packRegistry())).toEqual(coverage);
    await editTokens(root, (tokens) => {
      tokens['color']!['warning']!.$value = 'oklch(80% 0.15 80)';
    });
    const next = await refreshDraftCoverage(root, packRegistry());
    expect(next?.tokens.find((item) => item.token === 'color.warning')).toMatchObject({ source: 'agent' });
  });
});

describe('draft attachment ids', () => {
  it('takes ids from meta.json that are safe and belong to the project', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'studio-draft-'));
    roots.push(root);
    await mkdir(path.join(root, 'source'), { recursive: true });
    await writeFile(path.join(root, META_FILE), JSON.stringify({ attachments: [{ id: 'img1' }, { id: '../../etc' }, { id: 'gone' }, { id: 'img1' }, { name: 'x' }, 'img2'] }));
    expect(await draftAttachmentIds(root, async (id) => id !== 'gone')).toEqual(['img1']);
    await writeFile(path.join(root, META_FILE), '{ broken');
    expect(await draftAttachmentIds(root, async () => true)).toEqual([]);
  });
});
