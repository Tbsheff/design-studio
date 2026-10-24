import { baseName } from './format';
import { shortInput } from './runState';

const PATH_KEYS = ['file_path', 'path', 'filePath', 'notebook_path'];

function humanize(raw: string): string {
  const words = raw.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function prettyToolName(name: string): string {
  const parts = name.split('__');
  if (parts[0] === 'mcp' && parts.length >= 3) return humanize(parts.slice(2).join(' '));
  if (/^[a-z]/.test(name) || name.includes('_')) return humanize(name);
  return name;
}

function isAbsolutePath(value: string): boolean {
  return value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('~/');
}

function relativePath(file: string, workTree: string | null): string {
  const norm = file.replace(/\\/g, '/');
  const root = workTree?.replace(/\\/g, '/').replace(/\/+$/, '');
  if (root && norm.startsWith(`${root}/`)) return norm.slice(root.length + 1);
  return isAbsolutePath(norm) ? baseName(norm) : norm;
}

function pathInput(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  for (const key of PATH_KEYS) {
    const v = o[key];
    if (typeof v === 'string' && v) return v;
  }
  return null;
}

export function toolTarget(input: unknown, workTree: string | null): string {
  const file = pathInput(input);
  if (file) return relativePath(file, workTree);
  const raw = shortInput(input);
  return isAbsolutePath(raw) ? relativePath(raw, workTree) : raw;
}

export const SKILL_TOOL = 'Skill';

export function skillToolName(input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const value = (input as Record<string, unknown>)['skill'];
  if (typeof value !== 'string') return '';
  return value.startsWith('personal:') ? value.slice('personal:'.length) : value;
}

export function toolLabel(name: string, input: unknown): string {
  if (name !== SKILL_TOOL) return prettyToolName(name);
  const skill = skillToolName(input);
  return skill ? `Skill · ${skill}` : 'Skill';
}

const TOOL_VERBS: Record<string, string> = {
  Read: 'Read',
  Write: 'Write',
  Edit: 'Edit',
  MultiEdit: 'Edit',
  Bash: 'Run',
  Grep: 'Search',
  Glob: 'Find',
  WebFetch: 'Fetch',
  TodoWrite: 'Update todos',
  Skill: 'Skill',
  mcp__studio__render_check: 'Render check',
  mcp__studio__screenshot: 'Screenshot',
  mcp__studio__design_review: 'Design review',
  mcp__studio__define_tweaks: 'Define tweaks',
  mcp__studio__design_system_check: 'Design system check',
};

export function toolVerb(name: string): string {
  return TOOL_VERBS[name] ?? prettyToolName(name);
}

export function toolSubject(name: string, input: unknown, workTree: string | null): string {
  if (name === SKILL_TOOL) return skillToolName(input);
  if (name === 'TodoWrite') return '';
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    if (typeof record['viewport'] === 'string') return record['viewport'];
    if (name.startsWith('mcp__') && !pathInput(input)) return '';
  }
  return toolTarget(input, workTree);
}
