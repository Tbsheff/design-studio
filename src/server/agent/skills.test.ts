import { existsSync, readlinkSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { discoverSkills, parseFrontMatter, prepareSkills } from './skills.js';

let root: string;
let home: string;

async function skill(dir: string, name: string, description: string, body = ''): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n${body}\n`);
}

async function json(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
}

beforeAll(async () => {
  root = realpathSync(await mkdtemp(path.join(os.tmpdir(), 'studio-skills-')));
  home = path.join(root, 'claude');
  await skill(path.join(home, 'skills', 'design-kit'), 'design-kit', 'Polish UI.');
  await skill(path.join(root, 'elsewhere', 'linked'), 'linked', 'A linked skill.', 'Run `bash scripts/go.sh`.');
  await symlink(path.join(root, 'elsewhere', 'linked'), path.join(home, 'skills', 'linked'));
  await mkdir(path.join(home, 'skills', 'empty-folder'), { recursive: true });
  await skill(path.join(home, 'skills', '.system', 'hidden'), 'hidden', 'Hidden.');
  await skill(path.join(home, 'skills', 'synced', 'x', 'docx'), 'docx', 'Synced.');
  const ctx = path.join(home, 'plugins', 'cache', 'm', 'ctx', '1.0.0');
  await json(path.join(ctx, '.claude-plugin', 'plugin.json'), { name: 'ctx', mcpServers: { a: {} }, hooks: 'hooks.json' });
  await skill(path.join(ctx, 'skills', 'ctx-stats'), 'ctx-stats', '>\n  Show stats\n  for context.');
  await json(path.join(ctx, 'hooks', 'hooks.json'), {});
  const off = path.join(home, 'plugins', 'cache', 'm', 'off', '1.0.0');
  await skill(path.join(off, 'skills', 'nope'), 'nope', 'Disabled plugin.');
  await json(path.join(home, 'plugins', 'installed_plugins.json'), {
    version: 2,
    plugins: {
      'ctx@m': [{ scope: 'project', installPath: '/nowhere' }, { scope: 'user', installPath: ctx }],
      'off@m': [{ scope: 'user', installPath: off }],
    },
  });
  await json(path.join(home, 'settings.json'), { enabledPlugins: { 'ctx@m': true, 'off@m': false, 'gone@m': true } });
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('parseFrontMatter', () => {
  it('reads plain, quoted and folded values', () => {
    expect(parseFrontMatter('---\nname: "a-b"\ndescription: >\n  one\n  two\nlicense: MIT\n---\nbody')).toEqual({ name: 'a-b', description: 'one two', license: 'MIT' });
    expect(parseFrontMatter('no front matter')).toEqual({});
  });
});

describe('discoverSkills', () => {
  it('finds personal skills and skills of enabled plugins only', async () => {
    const catalog = await discoverSkills(home);
    expect(catalog.skills.map((s) => s.id)).toEqual(['personal:design-kit', 'personal:linked', 'ctx:ctx-stats']);
    const linked = catalog.skills.find((s) => s.id === 'personal:linked');
    expect(linked).toMatchObject({ origin: 'personal', sourcePath: path.join(root, 'elsewhere', 'linked'), needsBash: true });
    expect(catalog.skills.find((s) => s.id === 'ctx:ctx-stats')).toMatchObject({ origin: 'plugin:ctx', description: 'Show stats for context.', needsBash: false });
  });

  it('reports folders and plugins that did not load', async () => {
    const { problems } = await discoverSkills(home);
    expect(problems.map((p) => p.reason).sort()).toEqual(['no SKILL.md in this folder', 'plugin is enabled in settings.json but has no user install on disk']);
  });

  it('returns nothing for a missing home', async () => {
    expect(await discoverSkills(path.join(root, 'missing'))).toEqual({ skills: [], problems: [] });
  });
});

describe('discoverSkills cache', () => {
  it('sees an added skill, an edited description and a removed skill on the next scan', async () => {
    const fresh = path.join(root, 'fresh-home');
    await skill(path.join(fresh, 'skills', 'alpha'), 'alpha', 'First.');
    expect((await discoverSkills(fresh)).skills.map((s) => s.id)).toEqual(['personal:alpha']);
    await skill(path.join(fresh, 'skills', 'beta'), 'beta', 'Second.');
    expect((await discoverSkills(fresh)).skills.map((s) => s.id)).toEqual(['personal:alpha', 'personal:beta']);
    await skill(path.join(fresh, 'skills', 'alpha'), 'alpha', 'First, now longer and edited.', 'Run `npx thing`.');
    expect((await discoverSkills(fresh)).skills.find((s) => s.id === 'personal:alpha')).toMatchObject({ description: 'First, now longer and edited.', needsBash: true });
    await rm(path.join(fresh, 'skills', 'beta'), { recursive: true });
    expect((await discoverSkills(fresh)).skills.map((s) => s.id)).toEqual(['personal:alpha']);
    await rm(path.join(fresh, 'skills', 'alpha', 'SKILL.md'));
    const gone = await discoverSkills(fresh);
    expect(gone.skills).toEqual([]);
    expect(gone.problems.map((p) => p.reason)).toEqual(['no SKILL.md in this folder']);
  });

  it('keeps folder order with many skills read at once', async () => {
    const many = path.join(root, 'many-home');
    const names = Array.from({ length: 85 }, (_, index) => `s-${String(index).padStart(2, '0')}`);
    await Promise.all(names.map((name) => skill(path.join(many, 'skills', name), name, `Skill ${name}.`)));
    for (let pass = 0; pass < 3; pass += 1) expect((await discoverSkills(many)).skills.map((s) => s.id)).toEqual(names.map((name) => `personal:${name}`));
  });
});

describe('prepareSkills', () => {
  it('links only skill folders into generated plugins and skips turned-off skills', async () => {
    const out = path.join(root, 'out');
    const prepared = await prepareSkills({ root: out, disabled: ['personal:design-kit'], home });
    expect(prepared.enabled).toEqual(['personal:linked', 'ctx:ctx-stats']);
    expect(prepared.pluginDirs).toHaveLength(2);
    for (const dir of prepared.pluginDirs) {
      expect(readdirSync(dir).sort()).toEqual(['.claude-plugin', 'skills']);
      const manifest = JSON.parse(readFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), 'utf8')) as Record<string, unknown>;
      expect(Object.keys(manifest).sort()).toEqual(['description', 'name', 'version']);
    }
    const ctxDir = prepared.pluginDirs.find((dir) => path.basename(dir).startsWith('ctx-'));
    expect(ctxDir && readlinkSync(path.join(ctxDir, 'skills', 'ctx-stats'))).toBe(prepared.catalog.skills[2]?.sourcePath);
    expect(prepared.readableDirs).toEqual([path.join(root, 'elsewhere', 'linked'), prepared.catalog.skills[2]?.sourcePath]);
    const again = await prepareSkills({ root: out, disabled: ['personal:design-kit'], home });
    expect(again.pluginDirs).toEqual(prepared.pluginDirs);
  });

  it('loads no plugin when every skill is off', async () => {
    const prepared = await prepareSkills({ root: path.join(root, 'out2'), disabled: ['personal:design-kit', 'personal:linked', 'ctx:ctx-stats'], home });
    expect(prepared).toMatchObject({ enabled: [], pluginDirs: [], readableDirs: [] });
    expect(existsSync(path.join(root, 'out2'))).toBe(true);
  });
});
