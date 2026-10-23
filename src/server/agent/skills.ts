import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, realpath, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { SkillCatalog, SkillInfo, SkillProblem } from '../../shared/contracts.js';

const PERSONAL_PLUGIN = 'personal';

const SKIPPED_PERSONAL_DIRS = new Set(['synced']);
const BASH_HINT = /```(bash|sh|shell|zsh)\b|\bscripts?\/|\bbash\b|\bnpx\b|\bnpm (run|install)\b|\bpython3?\b|\bcurl\b|\bgit (clone|commit|push)\b/i;

function claudeHome(): string {
  return process.env['STUDIO_CLAUDE_HOME'] || path.join(os.homedir(), '.claude');
}

function unquote(value: string): string {
  const trimmed = value.trim();
  const quoted = trimmed.length >= 2 && (trimmed[0] === '"' || trimmed[0] === "'") && trimmed.endsWith(trimmed[0]);
  return quoted ? trimmed.slice(1, -1) : trimmed;
}

function readBlockScalar(lines: string[], start: number): { value: string; next: number } {
  const parts: string[] = [];
  let index = start;
  while (index < lines.length && (lines[index] === '' || /^\s/.test(lines[index] ?? ''))) {
    parts.push((lines[index] ?? '').trim());
    index += 1;
  }
  return { value: parts.filter(Boolean).join(' '), next: index };
}

export function parseFrontMatter(source: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match?.[1]) return {};
  const lines = match[1].split(/\r?\n/);
  const fields: Record<string, string> = {};
  let index = 0;
  while (index < lines.length) {
    const field = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(lines[index] ?? '');
    index += 1;
    if (!field?.[1]) continue;
    const raw = field[2] ?? '';
    if (/^[>|][+-]?$/.test(raw.trim())) {
      const block = readBlockScalar(lines, index);
      fields[field[1]] = block.value;
      index = block.next;
    } else {
      fields[field[1]] = unquote(raw);
    }
  }
  return fields;
}

async function readJsonFile(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8')) as unknown;
}

async function isDir(target: string): Promise<boolean> {
  return stat(target).then((info) => info.isDirectory(), () => false);
}

interface SkillSource {
  plugin: string;
  origin: SkillInfo['origin'];
  entryName: string;
  dir: string;
}

interface Scan {
  skills: SkillInfo[];
  problems: SkillProblem[];
}

async function readSkill(source: SkillSource, scan: Scan): Promise<void> {
  const file = path.join(source.dir, 'SKILL.md');
  if (!existsSync(file)) {
    scan.problems.push({ source: source.dir, reason: 'no SKILL.md in this folder' });
    return;
  }
  const text = await readFile(file, 'utf8');
  const fields = parseFrontMatter(text);
  const description = fields['description'] ?? '';
  if (!description) {
    scan.problems.push({ source: file, reason: 'SKILL.md has no description in its front matter' });
    return;
  }
  scan.skills.push({
    id: `${source.plugin}:${source.entryName}`,
    name: fields['name'] || source.entryName,
    description,
    origin: source.origin,
    sourcePath: await realpath(source.dir),
    needsBash: BASH_HINT.test(text),
    modelInvocable: fields['disable-model-invocation'] !== 'true',
  });
}

async function personalSources(home: string): Promise<SkillSource[]> {
  const root = path.join(home, 'skills');
  if (!(await isDir(root))) return [];
  const names = (await readdir(root)).filter((name) => !name.startsWith('.') && !SKIPPED_PERSONAL_DIRS.has(name)).sort();
  const sources: SkillSource[] = [];
  for (const name of names) {
    const dir = path.join(root, name);
    if (await isDir(dir)) sources.push({ plugin: PERSONAL_PLUGIN, origin: 'personal', entryName: name, dir });
  }
  return sources;
}

interface InstalledEntry {
  scope?: string;
  installPath?: string;
}

async function enabledPluginKeys(home: string): Promise<string[]> {
  const settings = (await readJsonFile(path.join(home, 'settings.json')).catch(() => ({}))) as { enabledPlugins?: Record<string, unknown> };
  return Object.entries(settings.enabledPlugins ?? {})
    .filter(([key, on]) => on === true && !key.endsWith('@builtin'))
    .map(([key]) => key)
    .sort();
}

async function installedPlugins(home: string): Promise<Record<string, InstalledEntry[]>> {
  const file = path.join(home, 'plugins', 'installed_plugins.json');
  const data = (await readJsonFile(file).catch(() => ({}))) as { plugins?: Record<string, InstalledEntry[]> };
  return data.plugins ?? {};
}

function manifestSkillPaths(manifest: { skills?: unknown }): string[] {
  const raw = manifest.skills;
  if (typeof raw === 'string') return [raw];
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

async function skillDirsUnder(candidate: string): Promise<string[]> {
  if (!(await isDir(candidate))) return [];
  if (existsSync(path.join(candidate, 'SKILL.md'))) return [candidate];
  const names = (await readdir(candidate)).filter((name) => !name.startsWith('.')).sort();
  const dirs = names.map((name) => path.join(candidate, name));
  return dirs.filter((dir) => existsSync(path.join(dir, 'SKILL.md')));
}

async function pluginSkillDirs(installPath: string, manifest: { skills?: unknown }): Promise<string[]> {
  const candidates = [path.join(installPath, 'skills'), ...manifestSkillPaths(manifest).map((rel) => path.resolve(installPath, rel))];
  const seen = new Map<string, string>();
  for (const candidate of candidates) {
    for (const dir of await skillDirsUnder(candidate)) seen.set(await realpath(dir), dir);
  }
  return [...seen.values()];
}

async function pluginSources(key: string, entries: InstalledEntry[] | undefined, problems: SkillProblem[]): Promise<SkillSource[]> {
  const installPath = entries?.find((entry) => entry.scope === 'user')?.installPath;
  if (!installPath || !(await isDir(installPath))) {
    problems.push({ source: key, reason: 'plugin is enabled in settings.json but has no user install on disk' });
    return [];
  }
  const manifest = (await readJsonFile(path.join(installPath, '.claude-plugin', 'plugin.json')).catch(() => ({}))) as { name?: unknown; skills?: unknown };
  const plugin = typeof manifest.name === 'string' && manifest.name ? manifest.name : (key.split('@')[0] ?? key);
  if (plugin === PERSONAL_PLUGIN) {
    problems.push({ source: key, reason: `plugin name "${plugin}" is reserved for personal skills` });
    return [];
  }
  const dirs = await pluginSkillDirs(installPath, manifest);
  return dirs.map((dir) => ({ plugin, origin: `plugin:${plugin}` as const, entryName: path.basename(dir), dir }));
}

export async function discoverSkills(home: string = claudeHome()): Promise<SkillCatalog> {
  const scan: Scan = { skills: [], problems: [] };
  const sources = await personalSources(home);
  const installed = await installedPlugins(home);
  for (const key of await enabledPluginKeys(home)) sources.push(...(await pluginSources(key, installed[key], scan.problems)));
  for (const source of sources) {
    await readSkill(source, scan).catch((error: unknown) => {
      scan.problems.push({ source: source.dir, reason: error instanceof Error ? error.message : String(error) });
    });
  }
  const ids = new Set<string>();
  scan.skills = scan.skills.filter((skill) => !ids.has(skill.id) && Boolean(ids.add(skill.id)));
  return scan;
}

export interface PreparedSkills {
  catalog: SkillCatalog;
  enabled: string[];
  invocableCount: number;
  pluginDirs: string[];
  readableDirs: string[];
}

function groupByPlugin(skills: SkillInfo[]): Map<string, SkillInfo[]> {
  const groups = new Map<string, SkillInfo[]>();
  for (const skill of skills) {
    const plugin = skill.id.slice(0, skill.id.indexOf(':'));
    groups.set(plugin, [...(groups.get(plugin) ?? []), skill]);
  }
  return groups;
}

function entryName(skill: SkillInfo): string {
  return skill.id.slice(skill.id.indexOf(':') + 1);
}

async function writePluginDir(target: string, plugin: string, skills: SkillInfo[]): Promise<void> {
  const temp = `${target}.tmp-${randomBytes(4).toString('hex')}`;
  await mkdir(path.join(temp, '.claude-plugin'), { recursive: true });
  await mkdir(path.join(temp, 'skills'));
  const manifest = { name: plugin, version: '0.0.0', description: `Skills from ${plugin === PERSONAL_PLUGIN ? '~/.claude/skills' : `the ${plugin} plugin`}, linked by Design Studio. Skills only: no hooks, MCP servers, agents or commands.` };
  await writeFile(path.join(temp, '.claude-plugin', 'plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const skill of skills) await symlink(skill.sourcePath, path.join(temp, 'skills', entryName(skill)), 'dir');
  try {
    await rename(temp, target);
  } catch {
    await rm(temp, { recursive: true, force: true });
  }
}

async function ensurePluginDir(root: string, plugin: string, skills: SkillInfo[]): Promise<string> {
  const digest = createHash('sha256')
    .update(JSON.stringify(skills.map((skill) => [skill.id, skill.sourcePath])))
    .digest('hex')
    .slice(0, 12);
  const target = path.join(root, `${plugin}-${digest}`);
  if (!existsSync(path.join(target, '.claude-plugin', 'plugin.json'))) await writePluginDir(target, plugin, skills);
  return target;
}

export async function prepareSkills(options: { root: string; disabled: readonly string[]; home?: string }): Promise<PreparedSkills> {
  const catalog = await discoverSkills(options.home);
  const off = new Set(options.disabled);
  const chosen = catalog.skills.filter((skill) => !off.has(skill.id));
  await mkdir(options.root, { recursive: true });
  const pluginDirs: string[] = [];
  for (const [plugin, skills] of groupByPlugin(chosen)) pluginDirs.push(await ensurePluginDir(options.root, plugin, skills));
  return {
    catalog,
    enabled: chosen.map((skill) => skill.id),
    invocableCount: chosen.filter((skill) => skill.modelInvocable).length,
    pluginDirs: await Promise.all(pluginDirs.map((dir) => realpath(dir))),
    readableDirs: chosen.map((skill) => skill.sourcePath),
  };
}
