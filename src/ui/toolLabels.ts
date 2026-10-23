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
