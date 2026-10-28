import { lstat, opendir, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { buildAppTokens } from './tokens.js';
import { readCssTokens } from './read-css.js';

const MAX_FILE_BYTES = 1024 * 1024;
const MIN_TOKENS = 4;
const WALK_ENTRIES = 60_000;
const WALK_DEPTH = 8;
const WALK_FILES = 200;
const NEGATIVE_TTL_MS = 30_000;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'public', 'static', 'vendor', 'coverage', 'target', 'Pods', 'DerivedData', 'bower_components', 'venv', '__pycache__', 'studio-data', 'design-system', 'snapshots']);
const KNOWN_FILES = [
  'app/globals.css',
  'src/app/globals.css',
  'src/styles/globals.css',
  'styles/globals.css',
  'src/globals.css',
  'src/index.css',
  'src/app.css',
  'app/app.css',
  'src/styles.css',
  'src/style.css',
  'src/styles/index.css',
  'src/assets/main.css',
  'app/tailwind.css',
  'src/tailwind.css',
];
const WORKSPACE_DIRS = ['apps', 'packages'];

interface Detected {
  file: string | null;
  at: number;
}

const cache = new Map<string, Detected>();

function inside(root: string, file: string): boolean {
  return file === root || file.startsWith(root + path.sep);
}

export async function safeFileInside(root: string, relative: string): Promise<string | null> {
  if (relative.includes('\0') || path.isAbsolute(relative)) return null;
  const full = path.resolve(root, relative);
  if (!inside(root, full)) return null;
  const info = await lstat(full).catch(() => null);
  if (!info?.isFile() || info.size > MAX_FILE_BYTES) return null;
  const real = await realpath(full).catch(() => null);
  return real && inside(root, real) ? real : null;
}

async function score(root: string, relative: string, bonus: number): Promise<number> {
  const file = await safeFileInside(root, relative);
  if (!file) return -1;
  const text = await readFile(file, 'utf8').catch(() => '');
  if (!text.includes('--')) return -1;
  const sheet = readCssTokens(text);
  const tokens = buildAppTokens(sheet).length;
  if (tokens < MIN_TOKENS) return -1;
  return tokens + bonus + (sheet.themeBlocks > 0 ? 100 : 0) + (sheet.tailwind ? 50 : 0);
}

async function subdirs(root: string, name: string): Promise<string[]> {
  const entries = await readdir(path.join(root, name), { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => `${name}/${entry.name}`);
}

async function shadcnCss(root: string, dir: string): Promise<string | null> {
  const file = await safeFileInside(root, dir ? `${dir}/components.json` : 'components.json');
  if (!file) return null;
  try {
    const css = (JSON.parse(await readFile(file, 'utf8')) as { tailwind?: { css?: unknown } }).tailwind?.css;
    if (typeof css !== 'string' || css === '') return null;
    return path.posix.normalize(dir ? `${dir}/${css}` : css);
  } catch {
    return null;
  }
}

async function walkCss(root: string): Promise<string[]> {
  const out: string[] = [];
  let entries = 0;
  const visit = async (dir: string, depth: number): Promise<void> => {
    if (depth > WALK_DEPTH || out.length >= WALK_FILES || entries > WALK_ENTRIES) return;
    const handle = await opendir(path.join(root, dir)).catch(() => null);
    if (!handle) return;
    for await (const entry of handle) {
      entries += 1;
      if (entries > WALK_ENTRIES || out.length >= WALK_FILES) break;
      if (entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await visit(relative, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith('.css') && !entry.name.endsWith('.min.css')) {
        out.push(relative);
      }
    }
  };
  await visit('', 0);
  return out;
}

async function best(root: string, candidates: Map<string, number>): Promise<string | null> {
  let top: { file: string; score: number } | null = null;
  for (const [file, bonus] of candidates) {
    const value = await score(root, file, bonus);
    if (value > 0 && (!top || value > top.score)) top = { file, score: value };
  }
  return top?.file ?? null;
}

async function detect(root: string): Promise<string | null> {
  const dirs = ['', ...(await Promise.all(WORKSPACE_DIRS.map((name) => subdirs(root, name)))).flat()];
  const candidates = new Map<string, number>();
  for (const dir of dirs) {
    const fromShadcn = await shadcnCss(root, dir);
    if (fromShadcn) candidates.set(fromShadcn, 200);
    for (const known of KNOWN_FILES) {
      const relative = dir ? `${dir}/${known}` : known;
      if (!candidates.has(relative)) candidates.set(relative, 20);
    }
  }
  const quick = await best(root, candidates);
  if (quick) return quick;
  return best(root, new Map((await walkCss(root)).map((file) => [file, 0])));
}

export async function findTokenFile(workTree: string): Promise<string | null> {
  const root = await realpath(workTree).catch(() => null);
  if (!root) return null;
  const cached = cache.get(root);
  if (cached?.file && (await safeFileInside(root, cached.file))) return cached.file;
  if (cached && cached.file === null && Date.now() - cached.at < NEGATIVE_TTL_MS) return null;
  const file = await detect(root);
  cache.set(root, { file, at: Date.now() });
  return file;
}
