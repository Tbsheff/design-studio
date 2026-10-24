import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DesignSystemCheckResult, ImportPackResult, OpenPackEditorResult, PackDetail, PackSummary, Project, SavePackResult } from '../../shared/contracts.js';
import { PACK_FILE } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { zipFiles, type ZipEntry } from '../design-system/zip.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, ServerConfig } from '../types.js';
import { createApp } from './app.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let app: ReturnType<typeof createApp>;

const runner: AgentRunner = {
  start: () => ({ runId: 'run', cancel: () => undefined, done: new Promise(() => undefined) }),
  get: () => undefined,
  isRunning: () => false,
};

function call(method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  const payload = body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body);
  return Promise.resolve(app.request(url, { method, headers, body: payload }));
}

async function ok<T>(response: Promise<Response>): Promise<T> {
  const res = await response;
  const text = await res.text();
  expect(res.status, text).toBe(200);
  return JSON.parse(text) as T;
}

async function failure(response: Promise<Response>): Promise<{ status: number; body: { error: string; message?: string; existing?: PackSummary } }> {
  const res = await response;
  return { status: res.status, body: (await res.json()) as { error: string; message?: string; existing?: PackSummary } };
}

async function exportZip(id: string): Promise<Buffer> {
  const res = await call('GET', `/api/packs/${id}/export`);
  expect(res.status).toBe(200);
  return Buffer.from(await res.arrayBuffer());
}

function importForm(bytes: Buffer, mode?: string): FormData {
  const form = new FormData();
  form.append('file', new File([new Uint8Array(bytes)], 'pack.zip', { type: 'application/zip' }));
  if (mode) form.append('mode', mode);
  return form;
}

const importZip = (bytes: Buffer, mode?: string) => call('POST', '/api/packs/import', importForm(bytes, mode));
const userPacks = async () => (await ok<PackSummary[]>(call('GET', '/api/packs'))).filter((pack) => pack.source === 'user');

async function packEntries(id: string, folder = id): Promise<ZipEntry[]> {
  const detail = await ok<PackDetail>(call('GET', `/api/packs/${id}`));
  const { source: _source, swatches: _swatches, darkSwatches: _dark, ...manifest } = detail.summary;
  return [
    { name: `${folder}/pack.json`, data: Buffer.from(JSON.stringify(manifest)) },
    { name: `${folder}/tokens.json`, data: Buffer.from(detail.tokensJson) },
    { name: `${folder}/DESIGN.md`, data: Buffer.from(detail.designMd) },
  ];
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  const versions = createVersionStore(config);
  const projects = createProjectStore(config, versions);
  app = createApp({ config, bus: createEventBus(config.dataDir), projects, versions, runner, preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' } });
});

afterEach(async () => {
  await cleanup();
});

describe('POST /api/packs/import', { timeout: 30000 }, () => {
  it('imports an exported zip as a new user pack with imported provenance', async () => {
    const result = await ok<ImportPackResult>(importZip(await exportZip('editorial')));
    expect(result.replaced).toBe(false);
    expect(result.pack).toMatchObject({ id: 'user-editorial', name: 'Editorial', source: 'user', provenance: 'imported' });
    const [original, imported] = await Promise.all([ok<PackDetail>(call('GET', '/api/packs/editorial')), ok<PackDetail>(call('GET', '/api/packs/user-editorial'))]);
    expect(imported.tokensJson).toBe(original.tokensJson);
    expect(imported.designMd).toBe(original.designMd);
  });

  it('refuses entries outside one pack folder and writes nothing', async () => {
    const good = await packEntries('editorial', 'editorial');
    const cases: Array<[string, ZipEntry[]]> = [
      ['parent folder', good.map((entry) => ({ ...entry, name: entry.name.replace('editorial/', '../editorial/') }))],
      ['absolute path', good.map((entry) => ({ ...entry, name: `/${entry.name}` }))],
      ['backslash', good.map((entry) => ({ ...entry, name: entry.name.replace('/', '\\') }))],
      ['nested folder', good.map((entry) => ({ ...entry, name: `x/${entry.name}` }))],
      ['no folder', good.map((entry) => ({ ...entry, name: entry.name.split('/')[1]! }))],
    ];
    for (const [label, entries] of cases) {
      const res = await failure(importZip(zipFiles(entries)));
      expect(res.status, label).toBe(400);
    }
    expect(await userPacks()).toEqual([]);
    const userDir = path.join(config.dataDir, 'packs');
    expect(existsSync(userDir) ? readdirSync(userDir).filter((name) => !name.startsWith('.')) : []).toEqual([]);
    expect(existsSync(path.join(config.dataDir, 'editorial'))).toBe(false);
  });

  it('refuses extra entries, two folders and missing files', async () => {
    const good = await packEntries('editorial');
    const extra = await failure(importZip(zipFiles([...good.slice(0, 2), { name: 'editorial/notes.txt', data: Buffer.from('hi') }])));
    expect(extra).toMatchObject({ status: 400, body: { error: expect.stringMatching(/unexpected file/) } });
    const four = await failure(importZip(zipFiles([...good, { name: 'editorial/notes.txt', data: Buffer.from('hi') }])));
    expect(four).toMatchObject({ status: 400, body: { error: expect.stringMatching(/more than 3 entries/) } });
    const twoFolders = await failure(importZip(zipFiles([good[0]!, good[1]!, { ...good[2]!, name: 'other/DESIGN.md' }])));
    expect(twoFolders).toMatchObject({ status: 400, body: { error: expect.stringMatching(/one design system folder/) } });
    const duplicate = await failure(importZip(zipFiles([good[0]!, good[1]!, good[1]!])));
    expect(duplicate.status).toBe(400);
    const missing = await failure(importZip(zipFiles(good.slice(0, 2))));
    expect(missing).toMatchObject({ status: 400, body: { error: expect.stringMatching(/no DESIGN.md/) } });
    expect(await userPacks()).toEqual([]);
  });

  it('refuses a zip larger than 2 MB, a file that inflates past 512 KB, and a non-zip', async () => {
    const big = await failure(importZip(randomBytes(2 * 1024 * 1024 + 10)));
    expect(big).toMatchObject({ status: 400, body: { error: expect.stringMatching(/larger than 2 MB/) } });
    const good = await packEntries('editorial');
    const bomb = await failure(importZip(zipFiles([good[0]!, { name: 'editorial/tokens.json', data: Buffer.alloc(4 * 1024 * 1024, 32) }, good[2]!])));
    expect(bomb).toMatchObject({ status: 400, body: { error: expect.stringMatching(/larger than 512 KB/) } });
    const junk = await failure(importZip(Buffer.from('not a zip at all, just text')));
    expect(junk).toMatchObject({ status: 400, body: { error: 'not a zip file' } });
    expect(await userPacks()).toEqual([]);
  });

  it('refuses a bad pack.json, bad tokens and an empty DESIGN.md with the reason', async () => {
    const good = await packEntries('editorial');
    const manifest = JSON.parse(good[0]!.data.toString()) as Record<string, unknown>;
    const noName = await failure(importZip(zipFiles([{ ...good[0]!, data: Buffer.from(JSON.stringify({ ...manifest, name: undefined })) }, good[1]!, good[2]!])));
    expect(noName).toMatchObject({ status: 400, body: { error: expect.stringMatching(/invalid pack.json/) } });
    const extraKey = await failure(importZip(zipFiles([{ ...good[0]!, data: Buffer.from(JSON.stringify({ ...manifest, script: 'x' })) }, good[1]!, good[2]!])));
    expect(extraKey.status).toBe(400);
    const notJson = await failure(importZip(zipFiles([{ ...good[0]!, data: Buffer.from('{') }, good[1]!, good[2]!])));
    expect(notJson).toMatchObject({ status: 400, body: { error: expect.stringMatching(/not valid JSON/) } });
    const badTokens = await failure(importZip(zipFiles([good[0]!, { ...good[1]!, data: Buffer.from('{"color":{"bg":{"$value":"red; }"}}}') }, good[2]!])));
    expect(badTokens).toMatchObject({ status: 400, body: { error: expect.stringMatching(/invalid tokens.json/) } });
    const emptyMd = await failure(importZip(zipFiles([good[0]!, good[1]!, { ...good[2]!, data: Buffer.from('  \n') }])));
    expect(emptyMd).toMatchObject({ status: 400, body: { error: 'DESIGN.md is empty' } });
    expect(await userPacks()).toEqual([]);
  });

  it('asks before it replaces a user pack with the same id or name, then replaces or keeps both', async () => {
    const copy = await ok<PackSummary>(call('POST', '/api/packs/editorial/duplicate', { name: 'House' }));
    const zip = await exportZip(copy.id);
    await ok(call('PATCH', `/api/packs/${copy.id}`, { description: 'Changed after export.' }));

    const asked = await failure(importZip(zip));
    expect(asked.status).toBe(409);
    expect(asked.body).toMatchObject({ error: 'pack_exists', existing: { id: 'user-house', name: 'House' } });
    expect(await userPacks()).toHaveLength(1);

    const replaced = await ok<ImportPackResult>(importZip(zip, 'replace'));
    expect(replaced).toMatchObject({ replaced: true, pack: { id: 'user-house', provenance: 'imported' } });
    expect(replaced.pack.description).not.toBe('Changed after export.');
    expect(await userPacks()).toHaveLength(1);

    const kept = await ok<ImportPackResult>(importZip(zip, 'copy'));
    expect(kept).toMatchObject({ replaced: false, pack: { id: 'user-house-2', name: 'House' } });
    expect((await userPacks()).map((pack) => pack.id).sort()).toEqual(['user-house', 'user-house-2']);

    const renamedEntries = (await packEntries('user-house', 'user-house')).map((entry) =>
      entry.name.endsWith('/pack.json') ? { ...entry, data: Buffer.from(JSON.stringify({ ...JSON.parse(entry.data.toString()), name: 'Other name' })) } : entry,
    );
    const draftPack = await ok<PackSummary>(call('PATCH', '/api/packs/user-house', { draft: true }));
    expect(draftPack.draft).toBe(true);
    const replacedDraft = await ok<ImportPackResult>(importZip(zip, 'replace'));
    expect(replacedDraft.pack.draft).toBe(true);
    const byId = await failure(importZip(zipFiles(renamedEntries)));
    expect(byId.body.existing?.id).toBe('user-house');
    const badMode = await failure(importZip(zip, 'merge'));
    expect(badMode.status).toBe(400);
  });
});

describe('GET /api/packs', () => {
  it('sends light and dark swatches for every built-in light pack and dark swatches only for a dark pack', async () => {
    const packs = (await ok<PackSummary[]>(call('GET', '/api/packs'))).filter((pack) => pack.source === 'builtin');
    expect(packs.length).toBeGreaterThan(0);
    for (const pack of packs) {
      expect(pack.swatches, pack.id).toHaveLength(6);
      if (pack.mode === 'light') {
        expect(pack.darkSwatches?.map((swatch) => swatch.name), pack.id).toEqual(pack.swatches.map((swatch) => swatch.name));
        expect(pack.darkSwatches?.find((swatch) => swatch.name === 'bg')?.value, pack.id).not.toBe(pack.swatches.find((swatch) => swatch.name === 'bg')?.value);
      } else {
        expect(pack.darkSwatches, pack.id).toBeUndefined();
      }
    }
  });
});

describe('GET /api/packs/:id/check', () => {
  it('passes every built-in pack and reports pack problems without kit page rules', async () => {
    const packs = await ok<PackSummary[]>(call('GET', '/api/packs'));
    for (const pack of packs.filter((item) => item.source === 'builtin')) {
      expect(await ok<DesignSystemCheckResult>(call('GET', `/api/packs/${pack.id}/check`)), pack.id).toEqual({ passed: true, problems: [] });
    }
    const detail = await ok<PackDetail>(call('GET', '/api/packs/modern-minimal'));
    const tokens = JSON.parse(detail.tokensJson) as { color: Record<string, { $value: string }> };
    tokens.color['fg-muted']!.$value = tokens.color.bg!.$value;
    const weak = await ok<PackSummary>(
      call('POST', '/api/packs', { name: 'Weak', mode: 'light', fonts: detail.summary.fonts, tokensJson: tokens, designMd: '# Weak\n\nNo sections.\n', provenance: 'original' }),
    );
    const result = await ok<DesignSystemCheckResult>(call('GET', `/api/packs/${weak.id}/check`));
    expect(result.passed).toBe(false);
    const rules = new Set(result.problems.map((problem) => problem.rule));
    expect(rules.has('contrast')).toBe(true);
    expect(rules.has('design-md')).toBe(true);
    expect(rules.has('kit-colors')).toBe(false);
    expect(result.problems.some((problem) => problem.message.includes('index.html'))).toBe(false);
    expect((await failure(call('GET', '/api/packs/nope/check'))).status).toBe(404);
  });
});

describe('POST /api/packs/:id/editor', { timeout: 30000 }, () => {
  it('creates one backing project from the pack files, then opens the same one again', async () => {
    const copy = await ok<PackSummary>(call('POST', '/api/packs/editorial/duplicate', { name: 'Ink' }));
    const [first, second] = await Promise.all([ok<OpenPackEditorResult>(call('POST', `/api/packs/${copy.id}/editor`)), ok<OpenPackEditorResult>(call('POST', `/api/packs/${copy.id}/editor`))]);
    expect([first.created, second.created].sort()).toEqual([false, true]);
    expect(first.project.id).toBe(second.project.id);
    const project = first.project;
    expect(project).toMatchObject({ name: 'Ink design system', kind: 'html', designSystemFor: copy.id, packId: copy.id });
    const tree = project.directions[0]!.workTree;
    const kit = await readFile(path.join(tree, 'index.html'), 'utf8');
    expect(kit).toContain('<h1>Ink</h1>');
    expect(JSON.parse(await readFile(path.join(tree, PACK_FILE), 'utf8'))).toMatchObject({ id: copy.id, name: 'Ink' });
    const meta = JSON.parse(await readFile(path.join(tree, 'source/meta.json'), 'utf8')) as Record<string, unknown>;
    expect(meta).toMatchObject({ kind: 'design-system-draft', packId: copy.id, attachments: [], inputs: { library: copy.id } });
    const packs = await userPacks();
    expect(packs.find((pack) => pack.id === copy.id)?.draft).toBeUndefined();
    const info = await ok<{ packId: string; coverage: unknown; check: DesignSystemCheckResult }>(call('GET', `/api/projects/${project.id}/design-system-draft`));
    expect(info).toMatchObject({ packId: copy.id, coverage: { grade: 'excellent', score: 100, fallbacks: [] }, check: { passed: true } });
    expect((await ok<Project[]>(call('GET', '/api/projects'))).filter((item) => item.designSystemFor === copy.id)).toHaveLength(1);
  });

  it('does not reopen the backing project of a deleted pack for a new pack with the same id', async () => {
    const first = await ok<PackSummary>(call('POST', '/api/packs/editorial/duplicate', { name: 'Reborn' }));
    expect(first.copiedFrom).toBe('editorial');
    const opened = await ok<OpenPackEditorResult>(call('POST', `/api/packs/${first.id}/editor`));
    await ok(call('DELETE', `/api/packs/${first.id}`));
    const old = await ok<Project>(call('GET', `/api/projects/${opened.project.id}`));
    expect(old).toMatchObject({ designSystemFor: first.id, designSystemDeleted: true });
    const second = await ok<PackSummary>(call('POST', '/api/packs/editorial/duplicate', { name: 'Reborn' }));
    expect(second.id).toBe(first.id);
    const reopened = await ok<OpenPackEditorResult>(call('POST', `/api/packs/${second.id}/editor`));
    expect(reopened.created).toBe(true);
    expect(reopened.project.id).not.toBe(opened.project.id);
  });

  it('refuses built-in and unknown packs', async () => {
    expect((await failure(call('POST', '/api/packs/editorial/editor'))).status).toBe(400);
    expect((await failure(call('POST', '/api/packs/user-none/editor'))).status).toBe(404);
    expect(await ok<Project[]>(call('GET', '/api/projects'))).toEqual([]);
  });
});

describe('POST .../design-system/save with asNew', { timeout: 30000 }, () => {
  it('saves a copy as a new user pack and points the project at it', async () => {
    const house = await ok<PackSummary>(call('POST', '/api/packs/editorial/duplicate', { name: 'House' }));
    const { project } = await ok<{ project: Project }>(call('POST', '/api/projects', { prompt: 'Page', kind: 'html', startRun: false, packId: house.id }));
    const saved = await ok<SavePackResult>(call('POST', `/api/projects/${project.id}/d/main/design-system/save`, { name: 'House copy', asNew: true }));
    expect(saved.created).toBe(true);
    expect(saved.pack).toMatchObject({ id: 'user-house-copy', name: 'House copy', source: 'user' });
    expect(saved.project.packId).toBe('user-house-copy');
    expect(saved.version?.title).toBe('Save House copy to library');
    expect((await ok<PackDetail>(call('GET', `/api/packs/${house.id}`))).summary.name).toBe('House');
    const tree = project.directions[0]!.workTree;
    expect(JSON.parse(await readFile(path.join(tree, PACK_FILE), 'utf8'))).toMatchObject({ id: 'user-house-copy' });

    const again = await ok<SavePackResult>(call('POST', `/api/projects/${project.id}/d/main/design-system/save`, { name: 'House copy' }));
    expect(again).toMatchObject({ created: false, pack: { id: 'user-house-copy' } });
    const both = await failure(call('POST', `/api/projects/${project.id}/d/main/design-system/save`, { name: 'X', asNew: true, packId: house.id }));
    expect(both.status).toBe(400);
  });
});
