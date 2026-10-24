import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CreateUserPackInput } from '../../shared/contracts.js';
import { composeDesignMd, splitDesignMd } from './design-md.js';
import { createPackLibrary, type PackLibrary } from './library.js';
import { createPackRegistry, loadAllPacks, type PackRegistry } from './packs.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN = path.join(HERE, 'packs');
const FIXTURE = path.join(HERE, '__fixtures__', 'test-pack');

let root: string;
let userDir: string;
let registry: PackRegistry;
let library: PackLibrary;

async function fixtureInput(name = 'Brand One'): Promise<CreateUserPackInput> {
  const manifest = JSON.parse(await readFile(path.join(FIXTURE, 'pack.json'), 'utf8')) as CreateUserPackInput & { id: string };
  return {
    name,
    mode: manifest.mode,
    fonts: manifest.fonts,
    tokensJson: await readFile(path.join(FIXTURE, 'tokens.json'), 'utf8'),
    designMd: await readFile(path.join(FIXTURE, 'DESIGN.md'), 'utf8'),
    provenance: 'imported',
    tags: ['brand'],
  };
}

async function errorOf(task: Promise<unknown>): Promise<Error & { status?: number }> {
  try {
    await task;
  } catch (error) {
    return error as Error & { status?: number };
  }
  throw new Error('expected a rejection');
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'studio library '));
  userDir = path.join(root, 'packs');
  registry = createPackRegistry(BUILTIN, { userDir });
  library = createPackLibrary(registry);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('pack registry with user packs', () => {
  it('lists built-in packs first, then valid user packs marked as user', async () => {
    const builtins = await registry.list();
    expect(builtins.length).toBe(8);
    expect(builtins.every((pack) => pack.source === 'builtin')).toBe(true);
    await library.createUserPack(await fixtureInput());
    const all = await registry.list();
    expect(all.slice(0, 8).map((pack) => pack.id)).toEqual(builtins.map((pack) => pack.id));
    expect(all.at(-1)).toMatchObject({ id: 'user-brand-one', source: 'user', name: 'Brand One', provenance: 'imported' });
  });

  it('skips invalid user packs, reports them, and picks up files changed outside the store', async () => {
    const good = await library.createUserPack(await fixtureInput('Good'));
    await cp(good.dir, path.join(userDir, 'user-broken'), { recursive: true });
    await writeFile(path.join(userDir, 'user-broken', 'tokens.json'), JSON.stringify({ color: {} }));
    await cp(good.dir, path.join(userDir, 'no-prefix'), { recursive: true });
    const manifest = JSON.parse(await readFile(path.join(good.dir, 'pack.json'), 'utf8')) as Record<string, unknown>;
    await writeFile(path.join(userDir, 'no-prefix', 'pack.json'), JSON.stringify({ ...manifest, id: 'no-prefix' }));

    const ids = (await registry.list()).filter((pack) => pack.source === 'user').map((pack) => pack.id);
    expect(ids).toEqual(['user-good']);
    const problems = await registry.problems();
    expect(problems.map((problem) => problem.id).sort()).toEqual(['no-prefix', 'user-broken']);
    expect(problems.find((problem) => problem.id === 'user-broken')?.errors.join('\n')).toContain('missing required token color.bg');
    expect(problems.find((problem) => problem.id === 'no-prefix')?.errors.join('\n')).toContain('must start with "user-"');

    const goodTokens = await readFile(path.join(good.dir, 'tokens.json'), 'utf8');
    await writeFile(path.join(userDir, 'user-broken', 'tokens.json'), goodTokens);
    await writeFile(path.join(userDir, 'user-broken', 'pack.json'), JSON.stringify({ ...manifest, id: 'user-broken', name: 'Fixed' }));
    expect((await registry.get('user-broken'))?.manifest.name).toBe('Fixed');
  });

  it('never loads a user pack over a built-in id', async () => {
    const loaded = await loadAllPacks(BUILTIN);
    expect(loaded.every((result) => result.source === 'builtin')).toBe(true);
    const dir = await mkdtemp(path.join(root, 'b'));
    await cp(FIXTURE, path.join(dir, 'test-pack'), { recursive: true });
    const isolated = createPackRegistry(dir, { userDir: dir });
    expect((await isolated.list()).map((pack) => `${pack.id}:${pack.source}`)).toEqual(['test-pack:builtin']);
  });
});

describe('pack library store', () => {
  it('creates a pack with a unique slug and dedupes -2, -3', async () => {
    const first = await library.createUserPack(await fixtureInput('Acme Brand'));
    const second = await library.createUserPack(await fixtureInput('Acme Brand'));
    const third = await library.createUserPack(await fixtureInput('Acme Brand'));
    expect([first, second, third].map((pack) => pack.manifest.id)).toEqual(['user-acme-brand', 'user-acme-brand-2', 'user-acme-brand-3']);
    expect(first.manifest).toMatchObject({ license: 'Custom', description: 'Acme Brand design system.', tags: ['brand'] });
    expect(first.designMd).not.toContain('studio:tokens');
    expect((await readdir(userDir)).sort()).toEqual(['user-acme-brand', 'user-acme-brand-2', 'user-acme-brand-3']);
  });

  it('accepts tokensJson as an object', async () => {
    const input = await fixtureInput('Object Tokens');
    const pack = await library.createUserPack({ ...input, tokensJson: JSON.parse(input.tokensJson as string) as Record<string, unknown> });
    expect(pack.tokens.color).toBeDefined();
  });

  it('rejects invalid input with a clear 400 and writes nothing', async () => {
    const input = await fixtureInput('Bad');
    const cases: [unknown, string][] = [
      [{ ...input, tokensJson: '{"color":{}}' }, 'missing required token color.bg'],
      [{ ...input, tokensJson: '{nope' }, 'invalid tokens.json'],
      [{ ...input, designMd: '   ' }, 'DESIGN.md is empty'],
      [{ ...input, mode: 'sepia' }, 'mode'],
      [{ ...input, extra: true }, 'invalid design system'],
      [{ ...input, fonts: { ...input.fonts, googleFontsUrl: 'https://evil.example/x.css' } }, 'fonts.googleapis.com'],
    ];
    for (const [body, message] of cases) {
      const error = await errorOf(library.createUserPack(body));
      expect(error.status, message).toBe(400);
      expect(error.message).toContain(message);
    }
    const left = await readdir(userDir).catch(() => []);
    expect(left).toEqual([]);
  });

  it('updates a user pack in place and keeps the id', async () => {
    const pack = await library.createUserPack(await fixtureInput('Keep Id'));
    const updated = await library.updateUserPack(pack.manifest.id, { description: 'New words.', designMd: '# Keep Id\n\nNew prose.\n' });
    expect(updated.manifest).toMatchObject({ id: 'user-keep-id', name: 'Keep Id', description: 'New words.' });
    expect(updated.designMd).toBe('# Keep Id\n\nNew prose.\n');
    expect(updated.tokensText).toBe(pack.tokensText);
    const bad = await errorOf(library.updateUserPack(pack.manifest.id, { tokensJson: '{"color":{}}' }));
    expect(bad.status).toBe(400);
    expect((await registry.get(pack.manifest.id))?.manifest.description).toBe('New words.');
    expect((await readdir(userDir)).filter((name) => name.startsWith('.'))).toEqual([]);
  });

  it('keeps a draft marked as draft through updates and renames, and a duplicate is not a draft', async () => {
    const pack = await library.createUserPack({ ...(await fixtureInput('Half Done')), draft: true });
    expect(pack.summary.draft).toBe(true);
    expect((await library.renamePack(pack.manifest.id, 'Half Done 2')).manifest.draft).toBe(true);
    expect((await library.updateUserPack(pack.manifest.id, { description: 'More.' })).manifest.draft).toBe(true);
    expect((await library.duplicatePack(pack.manifest.id)).manifest.draft).toBeUndefined();
    const published = await library.updateUserPack(pack.manifest.id, { draft: false });
    expect(published.manifest.draft).toBeUndefined();
    expect(JSON.parse(await readFile(path.join(published.dir, 'pack.json'), 'utf8'))).not.toHaveProperty('draft');
  });

  it('renames only the display name', async () => {
    const pack = await library.createUserPack(await fixtureInput('Old Name'));
    const renamed = await library.renamePack(pack.manifest.id, 'New Name');
    expect(renamed.manifest).toMatchObject({ id: 'user-old-name', name: 'New Name' });
  });

  it('duplicates a built-in or a user pack', async () => {
    const copy = await library.duplicatePack('editorial');
    expect(copy.manifest).toMatchObject({ id: 'user-editorial-copy', name: 'Editorial copy', provenance: 'original' });
    expect(copy.tokensText).toBe((await registry.get('editorial'))?.tokensText);
    const again = await library.duplicatePack(copy.manifest.id, 'Mine');
    expect(again.manifest).toMatchObject({ id: 'user-mine', name: 'Mine' });
  });

  it('deletes user packs only', async () => {
    const pack = await library.createUserPack(await fixtureInput('Gone'));
    await library.deletePack(pack.manifest.id);
    expect(await registry.get(pack.manifest.id)).toBeNull();
    expect(await readdir(userDir)).toEqual([]);
    expect((await errorOf(library.deletePack('editorial'))).status).toBe(400);
    expect((await errorOf(library.deletePack('user-missing'))).status).toBe(404);
    expect((await errorOf(library.updateUserPack('editorial', { name: 'X' }))).status).toBe(400);
    expect(await registry.get('editorial')).not.toBeNull();
  });

  it('exports a zip with the three files', async () => {
    const pack = await library.createUserPack(await fixtureInput('Zip Me'));
    const { fileName, bytes } = await library.exportPack(pack.manifest.id);
    expect(fileName).toBe('user-zip-me.zip');
    const file = path.join(root, fileName);
    await writeFile(file, bytes);
    const listing = execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).trim().split('\n');
    expect(listing).toEqual(['user-zip-me/pack.json', 'user-zip-me/tokens.json', 'user-zip-me/DESIGN.md']);
    expect(execFileSync('unzip', ['-p', file, 'user-zip-me/tokens.json'], { encoding: 'utf8' })).toBe(pack.tokensText);
    execFileSync('unzip', ['-tq', file]);
  });
});

describe('DESIGN.md split', () => {
  it('inverts composeDesignMd for every built-in pack', async () => {
    for (const result of await loadAllPacks(BUILTIN)) {
      const pack = result.pack;
      if (!pack) throw new Error(`${result.id} did not load`);
      for (const notes of ['', 'Use big type.\n\n### Sub\n\nMore notes.']) {
        const composed = composeDesignMd(pack.designMd, pack.entries, notes);
        const parts = splitDesignMd(composed);
        expect(parts.notes, result.id).toBe(notes.trim());
        expect(parts.prose.trim(), result.id).toBe(pack.designMd.trim());
        expect(composeDesignMd(parts.prose, pack.entries, parts.notes), result.id).toBe(composed);
      }
    }
  });

  it('ends the notes at the next top-level section and ignores headings in fences', () => {
    const md = '# T\n\nProse.\n\n## Project notes\n\nA\n\n```\n## Not a heading\n```\n\n## Later\n\nTail.\n';
    expect(splitDesignMd(md)).toEqual({ prose: '# T\n\nProse.\n\n## Later\n\nTail.\n', notes: 'A\n\n```\n## Not a heading\n```' });
  });
});
