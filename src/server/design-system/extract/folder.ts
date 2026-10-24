import { lstat, opendir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { customProperties, parseCss } from './css.js';
import type { CustomProperties } from './css.js';
import { matchName } from './names.js';
import type { ValueKind } from './names.js';
import { TokensFileError, harvestTokensFile } from './tokens-file.js';
import type { Candidate, Harvest } from './types.js';
import { candidate, candidatesFromVars } from './vars.js';
import { normalizeColor } from './values.js';
import { flattenJs, objectAfter } from './js-literal.js';

export interface FolderLimits {
  maxEntries: number;
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  maxDepth: number;
}

export const FOLDER_LIMITS: FolderLimits = { maxEntries: 20_000, maxFiles: 300, maxFileBytes: 1024 * 1024, maxTotalBytes: 16 * 1024 * 1024, maxDepth: 10 };

export class FolderScanError extends Error {}

export interface FolderScan {
  harvest: Harvest;
  files: string[];
  skipped: string[];
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache', '.parcel-cache', 'coverage', 'vendor', 'bower_components', '.venv', 'venv', '__pycache__', 'target', 'Pods', 'DerivedData', '.idea', '.vscode']);
const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less', '.pcss', '.postcss']);
const TAILWIND = /^tailwind\.config\.(js|cjs|mjs|ts|cts|mts)$/;
const TOKENS_JSON = /(^|[.-])(tokens?|design-tokens|theme)(\.[a-z]+)?\.json$/i;
const THEME_SCRIPT = /^(theme|tokens|colors)\.(js|cjs|mjs|ts)$/i;

type FileKind = 'style' | 'tailwind' | 'tokens' | 'theme-script';

function kindOf(name: string): FileKind | null {
  const ext = path.extname(name).toLowerCase();
  if (STYLE_EXT.has(ext) && !name.endsWith('.min.css')) return 'style';
  if (TAILWIND.test(name)) return 'tailwind';
  if (TOKENS_JSON.test(name)) return 'tokens';
  if (THEME_SCRIPT.test(name)) return 'theme-script';
  return null;
}

async function collect(root: string, limits: FolderLimits): Promise<{ files: Array<{ file: string; kind: FileKind }>; skipped: string[] }> {
  const files: Array<{ file: string; kind: FileKind }> = [];
  const skipped: string[] = [];
  let entries = 0;
  const visit = async (dir: string, depth: number): Promise<void> => {
    if (depth > limits.maxDepth || files.length >= limits.maxFiles) return;
    const handle = await opendir(dir).catch(() => null);
    if (!handle) return;
    for await (const entry of handle) {
      entries += 1;
      if (entries > limits.maxEntries || files.length >= limits.maxFiles) {
        skipped.push(`stopped after ${limits.maxEntries} entries or ${limits.maxFiles} files`);
        return;
      }
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) await visit(full, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      const kind = kindOf(entry.name);
      if (kind) files.push({ file: full, kind });
    }
  };
  await visit(root, 0);
  return { files, skipped: [...new Set(skipped)] };
}

function scssVariables(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of text.matchAll(/^[ \t]*[$@]([A-Za-z_][\w-]*)\s*:\s*([^;\n]+);/gm)) {
    const value = (match[2] ?? '').replace(/\s*!default\s*$/, '').trim();
    if (match[1] && value) out.set(`--${match[1]}`, value);
  }
  for (const [name, value] of out) {
    const ref = /^[$@]([A-Za-z_][\w-]*)$/.exec(value);
    if (ref) out.set(name, out.get(`--${ref[1]}`) ?? value);
  }
  return out;
}

const TAILWIND_SECTIONS: Array<[string, string, ValueKind]> = [
  ['colors', 'color', 'color'],
  ['fontFamily', 'font', 'font'],
  ['borderRadius', 'radius', 'dimension'],
  ['boxShadow', 'shadow', 'shadow'],
  ['fontSize', 'text', 'dimension'],
  ['spacing', 'space', 'dimension'],
];

function sectionCandidates(text: string, [key, group, kind]: [string, string, ValueKind], label: string): Candidate[] {
  const object = objectAfter(text, key);
  if (!object) return [];
  const flat = new Map<string, string>();
  flattenJs(object, [], flat);
  const out: Candidate[] = [];
  for (const [name, value] of flat) {
    const isColor = kind === 'color';
    const match = matchName(isColor && name !== '' ? name : name === '' ? group : `${group}-${name}`, isColor && !normalizeColor(value) ? 'unknown' : kind);
    const found = match ? candidate(match, { value }, 'folder', `${label}: theme.${key}.${name || 'DEFAULT'}`) : null;
    if (found) out.push(found);
  }
  return out;
}

function tailwindCandidates(text: string, label: string): Candidate[] {
  return TAILWIND_SECTIONS.flatMap((section) => sectionCandidates(text, section, label));
}

interface ScanAccumulator {
  props: CustomProperties;
  candidates: Candidate[];
  read: string[];
  skipped: string[];
}

function mergeMissing(target: Map<string, string>, source: Map<string, string>): void {
  for (const [name, value] of source) if (!target.has(name)) target.set(name, value);
}

function absorb(acc: ScanAccumulator, file: string, kind: FileKind, text: string, relative: string): void {
  if (kind === 'style') {
    const scoped = customProperties(parseCss(text));
    mergeMissing(acc.props.root, scoped.root);
    mergeMissing(acc.props.dark, scoped.dark);
    if (/\.(scss|sass|less)$/i.test(file)) mergeMissing(acc.props.root, scssVariables(text));
    return;
  }
  if (kind !== 'tokens') {
    acc.candidates.push(...tailwindCandidates(text, relative));
    return;
  }
  try {
    acc.candidates.push(...harvestTokensFile(text, relative).candidates.map((item) => ({ ...item, source: 'folder' as const })));
  } catch (error) {
    if (!(error instanceof TokensFileError)) throw error;
    acc.skipped.push(`${relative}: ${error.message}`);
  }
}

async function readMatched(root: string, files: Array<{ file: string; kind: FileKind }>, limits: FolderLimits, acc: ScanAccumulator): Promise<void> {
  let total = 0;
  const ordered = [...files].sort((a, b) => a.file.split(path.sep).length - b.file.split(path.sep).length);
  for (const { file, kind } of ordered) {
    const info = await lstat(file);
    const relative = path.relative(root, file);
    if (!info.isFile() || info.size > limits.maxFileBytes) {
      acc.skipped.push(`${relative}: larger than ${Math.round(limits.maxFileBytes / 1024)} KB`);
      continue;
    }
    if (total + info.size > limits.maxTotalBytes) {
      acc.skipped.push(`stopped at ${Math.round(limits.maxTotalBytes / 1024 / 1024)} MB of files`);
      return;
    }
    total += info.size;
    acc.read.push(relative);
    absorb(acc, file, kind, await readFile(file, 'utf8'), relative);
  }
}

async function resolveRoot(folderPath: string): Promise<string> {
  if (typeof folderPath !== 'string' || !path.isAbsolute(folderPath) || folderPath.includes('\0')) throw new FolderScanError('folder must be an absolute path');
  let root: string;
  try {
    root = await realpath(folderPath);
  } catch {
    throw new FolderScanError(`folder not found: ${folderPath}`);
  }
  if (!(await lstat(root)).isDirectory()) throw new FolderScanError(`not a folder: ${root}`);
  return root;
}

export async function scanFolder(folderPath: string, limits: FolderLimits = FOLDER_LIMITS): Promise<FolderScan> {
  const root = await resolveRoot(folderPath);
  const { files, skipped } = await collect(root, limits);
  const acc: ScanAccumulator = { props: { root: new Map(), dark: new Map() }, candidates: [], read: [], skipped };
  await readMatched(root, files, limits, acc);
  const candidates = [...candidatesFromVars(acc.props, 'folder', path.basename(root)), ...acc.candidates];
  return { harvest: { source: 'folder', label: root, candidates }, files: acc.read, skipped: acc.skipped };
}
