import { slugify } from './folders.js';

export type ShipMode = 'branch' | 'push' | 'pr';

export const SHIP_MODES: readonly ShipMode[] = ['branch', 'push', 'pr'];

export interface ShipSettings {
  user: string;
  branchTemplate: string;
  bodyTemplate: string;
  issueId: string;
}

export const DEFAULT_SHIP_SETTINGS: ShipSettings = {
  user: '',
  branchTemplate: '{user}/{issue}-{slug}',
  bodyTemplate: '{summary}\n\n### Studio versions\n{versions}\n\nFixes {ISSUE}',
  issueId: '',
};

export const SHIP_TEXT_MAX = { user: 40, branchTemplate: 200, bodyTemplate: 4000, issueId: 40, title: 200, commitMessage: 4000, body: 20000, branch: 200 };

export interface ShipRecord {
  versionId: string;
  baseVersionId: string;
  branch: string;
  sha: string;
  mode: ShipMode;
  pushed: boolean;
  prUrl: string | null;
  files: number;
  at: number;
}

export interface ShipRepoInfo {
  root: string;
  prefix: string;
  branch: string | null;
  head: string;
  remote: string | null;
  remoteUrl: string | null;
  github: boolean;
  gh: boolean;
}

export type ShipBaseKind = 'attached' | 'last-ship' | 'version';

export interface ShipBaseOption {
  versionId: string;
  title: string;
  at: number;
  kind: ShipBaseKind;
}

export type ShipFileStatus = 'added' | 'modified' | 'deleted';

export interface ShipFile {
  path: string;
  status: ShipFileStatus;
  additions: number | null;
  deletions: number | null;
  diff: string;
  diffCut: boolean;
  refused: string | null;
  conflict: string | null;
}

export interface ShipDefaults {
  branch: string;
  title: string;
  commitMessage: string;
  body: string;
}

export interface ShipPrepare {
  projectId: string;
  repo: ShipRepoInfo | null;
  blocked: string | null;
  base: ShipBaseOption | null;
  bases: ShipBaseOption[];
  headVersionId: string | null;
  files: ShipFile[];
  versions: { id: string; title: string }[];
  summary: string;
  settings: ShipSettings;
  defaults: ShipDefaults;
  vars: ShipTemplateVars;
  history: ShipRecord[];
}

export interface ShipRequest {
  baseVersionId: string;
  headVersionId: string;
  files: string[];
  branch: string;
  commitMessage: string;
  title: string;
  body: string;
  mode: ShipMode;
  client?: string;
}

export interface ShipResult {
  branch: string;
  sha: string;
  mode: ShipMode;
  pushed: boolean;
  remote: string | null;
  prUrl: string | null;
  prError: string | null;
  files: string[];
}

export interface ShipTemplateVars {
  user: string;
  issue: string;
  title: string;
  summary: string;
  versions: string[];
  files: string[];
}

const PLACEHOLDER = /\{(user|slug|issue|ISSUE|title|summary|versions|files)\}/g;

function values(vars: ShipTemplateVars): Record<string, string> {
  return {
    user: vars.user,
    slug: vars.title.trim() ? slugify(vars.title).slice(0, 40).replace(/-+$/, '') : '',
    issue: vars.issue.trim().toLowerCase(),
    ISSUE: vars.issue.trim(),
    title: vars.title.trim(),
    summary: vars.summary.trim(),
    versions: vars.versions.map((title) => `- ${title}`).join('\n'),
    files: vars.files.map((file) => `- \`${file}\``).join('\n'),
  };
}

export function renderShipTemplate(template: string, vars: ShipTemplateVars): string {
  const table = values(vars);
  const lines = template.split('\n').flatMap((line) => {
    const names = [...line.matchAll(PLACEHOLDER)].map((match) => match[1] ?? '');
    if (names.length > 0 && names.every((name) => (table[name] ?? '') === '')) return [];
    return [line.replace(PLACEHOLDER, (_all, name: string) => table[name] ?? '')];
  });
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function cleanBranchName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9/._-]+/g, '-')
    .split('/')
    .map((part) => part.replace(/\.{2,}/g, '.').replace(/^[-.]+|[-.]+$/g, '').replace(/\.lock$/, ''))
    .filter(Boolean)
    .join('/')
    .slice(0, 120)
    .replace(/[/.-]+$/, '');
}

export function renderBranchName(template: string, vars: ShipTemplateVars): string {
  return cleanBranchName(renderShipTemplate(template, vars).split('\n')[0] ?? '');
}

const SECRET_NAMES = new Set(['id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519', '.npmrc', '.netrc', '.pypirc', '.htpasswd', 'credentials.json', 'service-account.json', '.git-credentials']);
const SECRET_EXTENSIONS = ['.pem', '.key', '.p12', '.pfx', '.keystore', '.jks', '.secret', '.asc', '.gpg'];

export function refusedPath(file: string): string | null {
  const parts = file.split('/');
  const name = (parts[parts.length - 1] ?? '').toLowerCase();
  if (parts.some((part) => part === 'node_modules')) return 'node_modules is never committed.';
  if (parts.some((part) => part === '.git')) return '.git is never committed.';
  if (name.startsWith('.env')) return 'Environment files (.env*) are never committed.';
  if (SECRET_NAMES.has(name) || name.startsWith('id_rsa') || /^secrets?\./.test(name)) return 'This looks like a secret or credentials file.';
  if (SECRET_EXTENSIONS.some((ext) => name.endsWith(ext))) return 'Key and certificate files are never committed.';
  return null;
}

export const PRIVATE_KEY_PATTERN = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/;
