import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { DESIGN_SYSTEM_DIR, PACK_FILE, TOKENS_CSS_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import type { CompiledTokenEntry, PackManifest, PackProblem, PackSource, PackSummary, Project, TokenFile } from '../../shared/contracts.js';
import { compileTokens, parseTokenFile, resolveEntryValue } from './compile.js';
import { composeDesignMd as composeWithNotes } from './design-md.js';
import { resourcePath } from '../resources.js';

const PACKS_DIR = resourcePath('packs', path.join(path.dirname(fileURLToPath(import.meta.url)), 'packs'));
export const DESIGN_MD_FILE = 'DESIGN.md';
const REACT_ENTRY_FILE = 'src/main.tsx';
export const REACT_TOKENS_IMPORT = "import '../design-system/tokens.css';";
export const GOOGLE_FONTS_PREFIX = 'https://fonts.googleapis.com/';
const SWATCH_TOKENS = ['bg', 'surface', 'fg', 'primary', 'accent', 'border'];

export const USER_PACK_PREFIX = 'user-';
const PACK_FILES = ['pack.json', 'tokens.json', DESIGN_MD_FILE];

export const manifestSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(400),
    mode: z.enum(['light', 'dark']),
    tags: z.array(z.string().min(1).max(40)).max(20),
    license: z.string().trim().min(1).max(40),
    provenance: z.enum(['original', 'imported', 'extracted']),
    fonts: z
      .object({
        display: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(120),
        mono: z.string().trim().min(1).max(120),
        googleFontsUrl: z
          .string()
          .max(2000)
          .refine((url) => url.startsWith(GOOGLE_FONTS_PREFIX) && !/["'<>\s]/.test(url), 'must be an https://fonts.googleapis.com/ URL')
          .optional(),
      })
      .strict(),
    draft: z.literal(true).optional(),
    copiedFrom: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/).optional(),
  })
  .strict();

export interface LoadedPack {
  dir: string;
  source: PackSource;
  manifest: PackManifest;
  tokensText: string;
  tokens: TokenFile;
  entries: CompiledTokenEntry[];
  css: string;
  designMd: string;
  summary: PackSummary;
}

export interface PackLoadResult {
  id: string;
  source: PackSource;
  pack: LoadedPack | null;
  errors: string[];
}

export interface PackRegistry {
  dir: string;
  userDir: string | null;
  list(): Promise<PackSummary[]>;
  get(id: string): Promise<LoadedPack | null>;
  problems(): Promise<PackLoadResult[]>;
  invalidate(): void;
}

export interface PackRegistryOptions {
  userDir?: string | null;
}

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

export function formatIssues(prefix: string, error: z.ZodError): string[] {
  return error.issues.map((issue) => `${prefix} ${issue.path.join('.') || '(root)'}: ${issue.message}`);
}

function parseManifest(text: string | null, folderId: string, errors: string[]): PackManifest | null {
  if (text === null) {
    errors.push('pack.json is missing');
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    errors.push('pack.json is not valid JSON');
    return null;
  }
  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) {
    errors.push(...formatIssues('pack.json', parsed.error));
    return null;
  }
  if (parsed.data.id !== folderId) errors.push(`pack.json id "${parsed.data.id}" must match the folder name "${folderId}"`);
  return parsed.data as PackManifest;
}

function swatchesOf(entries: CompiledTokenEntry[]): PackSummary['swatches'] {
  return SWATCH_TOKENS.flatMap((name) => {
    const entry = entries.find((item) => item.path === `color.${name}`);
    return entry ? [{ name, value: resolveEntryValue(entries, entry) }] : [];
  });
}

async function loadPack(dir: string, source: PackSource): Promise<PackLoadResult> {
  const id = path.basename(dir);
  const errors: string[] = [];
  if (source === 'user' && !id.startsWith(USER_PACK_PREFIX)) errors.push(`user pack folder "${id}" must start with "${USER_PACK_PREFIX}"`);
  const manifest = parseManifest(await readText(path.join(dir, 'pack.json')), id, errors);
  const designMd = await readText(path.join(dir, DESIGN_MD_FILE));
  if (designMd === null || designMd.trim() === '') errors.push('DESIGN.md is missing or empty');
  const tokens = await loadTokens(dir, manifest?.mode ?? 'light', errors);
  if (errors.length > 0 || !manifest || !tokens || designMd === null) return { id, source, pack: null, errors };
  const summary: PackSummary = { ...manifest, source, swatches: swatchesOf(tokens.entries) };
  return { id, source, errors, pack: { dir, source, manifest, ...tokens, designMd, summary } };
}

async function loadTokens(dir: string, mode: PackManifest['mode'], errors: string[]): Promise<Pick<LoadedPack, 'tokensText' | 'tokens' | 'entries' | 'css'> | null> {
  const tokensText = await readText(path.join(dir, 'tokens.json'));
  if (tokensText === null) {
    errors.push('tokens.json is missing');
    return null;
  }
  const parsed = parseTokenFile(tokensText);
  if (!parsed.file) {
    errors.push(parsed.error ?? 'tokens.json is invalid');
    return null;
  }
  const compiled = compileTokens(parsed.file, { mode });
  errors.push(...compiled.errors.map((error) => `tokens.json ${error}`));
  return { tokensText, tokens: parsed.file, entries: compiled.entries, css: compiled.css };
}

async function packFolders(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name).sort();
}

export async function loadAllPacks(dir: string, source: PackSource = 'builtin'): Promise<PackLoadResult[]> {
  return Promise.all((await packFolders(dir)).map((name) => loadPack(path.join(dir, name), source)));
}

function logSkipped(result: PackLoadResult): void {
  const shown = result.errors.slice(0, 5).join('; ');
  const more = result.errors.length > 5 ? ` (+${result.errors.length - 5} more)` : '';
  console.error(`[packs] skipping ${result.source === 'user' ? 'user ' : ''}pack ${result.id}: ${shown}${more}`);
}

async function folderStamp(dir: string): Promise<string> {
  const parts = await Promise.all(
    PACK_FILES.map((name) =>
      stat(path.join(dir, name)).then(
        (info) => `${info.mtimeMs}:${info.size}`,
        () => '-',
      ),
    ),
  );
  return parts.join('|');
}

function createUserPackCache(userDir: string): { load(): Promise<PackLoadResult[]>; clear(): void } {
  let cache = new Map<string, { stamp: string; result: PackLoadResult }>();
  return {
    async load() {
      const next = new Map<string, { stamp: string; result: PackLoadResult }>();
      for (const name of await packFolders(userDir)) {
        const dir = path.join(userDir, name);
        const stamp = await folderStamp(dir);
        const known = cache.get(name);
        if (known && known.stamp === stamp) {
          next.set(name, known);
          continue;
        }
        const result = await loadPack(dir, 'user');
        if (!result.pack) logSkipped(result);
        next.set(name, { stamp, result });
      }
      cache = next;
      return [...next.values()].map((item) => item.result);
    },
    clear() {
      cache = new Map();
    },
  };
}

export function createPackRegistry(dir: string = PACKS_DIR, options: PackRegistryOptions = {}): PackRegistry {
  const userDir = options.userDir ?? null;
  let loading: Promise<PackLoadResult[]> | null = null;
  const loadBuiltin = (): Promise<PackLoadResult[]> => {
    loading ??= loadAllPacks(dir).then((results) => {
      for (const result of results) if (!result.pack) logSkipped(result);
      return results;
    });
    return loading;
  };
  const user = userDir ? createUserPackCache(userDir) : null;
  const loadAll = async (): Promise<PackLoadResult[]> => {
    const builtin = await loadBuiltin();
    if (!user) return builtin;
    const taken = new Set(builtin.map((result) => result.id));
    const users = (await user.load()).map((result) =>
      taken.has(result.id) ? { ...result, pack: null, errors: [`id "${result.id}" is used by a built-in pack`] } : result,
    );
    return [...builtin, ...users];
  };
  return {
    dir,
    userDir,
    async list() {
      return (await loadAll()).flatMap((result) => (result.pack ? [result.pack.summary] : []));
    },
    async get(id) {
      return (await loadAll()).find((result) => result.id === id)?.pack ?? null;
    },
    async problems() {
      return (await loadAll()).filter((result) => result.pack === null);
    },
    invalidate() {
      user?.clear();
    },
  };
}

export function packProblems(results: PackLoadResult[]): PackProblem[] {
  return results.map((result) => ({ id: result.id, source: result.source, errors: result.errors }));
}

const registries = new Map<string, PackRegistry>();

export function packRegistry(dir: string = PACKS_DIR, options: PackRegistryOptions = {}): PackRegistry {
  const userDir = options.userDir ? path.resolve(options.userDir) : null;
  const key = `${path.resolve(dir)}\0${userDir ?? ''}`;
  let registry = registries.get(key);
  if (!registry) {
    registry = createPackRegistry(path.resolve(dir), { userDir });
    registries.set(key, registry);
  }
  return registry;
}

export async function writeFileAtomic(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temp, content);
  await rename(temp, file);
}

function composeDesignMd(pack: LoadedPack, userNotes?: string): string {
  return composeWithNotes(pack.designMd, pack.entries, userNotes);
}

function addTokensImport(source: string): string {
  if (source.includes('design-system/tokens.css')) return source;
  return `${REACT_TOKENS_IMPORT}\n${source}`;
}

function fontLinkTags(url: string): string {
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link rel="stylesheet" href="${url.replace(/&/g, '&amp;')}">`,
  ].join('\n    ');
}

const STUDIO_FONT_BLOCK =
  /\n[ \t]*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/[^"]*">/;

function setFontLinks(html: string, url: string | undefined): string {
  if (STUDIO_FONT_BLOCK.test(html)) return html.replace(STUDIO_FONT_BLOCK, () => (url ? `\n    ${fontLinkTags(url)}` : ''));
  if (!url || html.includes('fonts.googleapis.com')) return html;
  const head = /<head[^>]*>/i.exec(html);
  if (!head) return html;
  const at = head.index + head[0].length;
  return `${html.slice(0, at)}\n    ${fontLinkTags(url)}${html.slice(at)}`;
}

async function patchFile(file: string, patch: (source: string) => string): Promise<boolean> {
  const source = await readText(file);
  if (source === null) return false;
  const next = patch(source);
  if (next !== source) await writeFileAtomic(file, next);
  return next !== source;
}

async function wireReact(workTree: string, manifest: PackManifest): Promise<string[]> {
  const written: string[] = [];
  if (await patchFile(path.join(workTree, REACT_ENTRY_FILE), addTokensImport)) written.push(REACT_ENTRY_FILE);
  if (await patchFile(path.join(workTree, 'index.html'), (html) => setFontLinks(html, manifest.fonts.googleFontsUrl))) written.push('index.html');
  return written;
}

interface ApplyPackOptions {
  userDesignMd?: string;
}

export function wiresReact(project: Project): boolean {
  return project.kind === 'react' && (!project.imported || project.imported.created === true);
}

export const WIRED_FILES = [REACT_ENTRY_FILE, 'index.html'];

export async function applyPack(project: Project, workTree: string, pack: LoadedPack, options: ApplyPackOptions = {}): Promise<string[]> {
  await mkdir(path.join(workTree, DESIGN_SYSTEM_DIR), { recursive: true });
  await writeFileAtomic(path.join(workTree, TOKENS_FILE), pack.tokensText.endsWith('\n') ? pack.tokensText : `${pack.tokensText}\n`);
  await writeFileAtomic(path.join(workTree, PACK_FILE), `${JSON.stringify(pack.manifest, null, 2)}\n`);
  await writeFileAtomic(path.join(workTree, TOKENS_CSS_FILE), pack.css);
  await writeFileAtomic(path.join(workTree, DESIGN_MD_FILE), composeDesignMd(pack, options.userDesignMd));
  const written = [TOKENS_FILE, PACK_FILE, TOKENS_CSS_FILE, DESIGN_MD_FILE];
  if (wiresReact(project)) written.push(...(await wireReact(workTree, pack.manifest)));
  return written;
}
