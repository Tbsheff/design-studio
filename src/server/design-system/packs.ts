import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { DESIGN_SYSTEM_DIR, PACK_FILE, TOKENS_CSS_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import type { CompiledTokenEntry, PackManifest, PackSummary, Project, TokenFile } from '../../shared/contracts.js';
import { compileTokens, parseTokenFile, resolveEntryValue } from './compile.js';
import { upsertTokenBlock } from './design-md.js';
import { resourcePath } from '../resources.js';

const PACKS_DIR = resourcePath('packs', path.join(path.dirname(fileURLToPath(import.meta.url)), 'packs'));
export const DESIGN_MD_FILE = 'DESIGN.md';
const PROJECT_NOTES_HEADING = '## Project notes';
const REACT_ENTRY_FILE = 'src/main.tsx';
export const REACT_TOKENS_IMPORT = "import '../design-system/tokens.css';";
export const GOOGLE_FONTS_PREFIX = 'https://fonts.googleapis.com/';
const SWATCH_TOKENS = ['bg', 'surface', 'fg', 'primary', 'accent', 'border'];

const manifestSchema = z
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
  })
  .strict();

export interface LoadedPack {
  dir: string;
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
  pack: LoadedPack | null;
  errors: string[];
}

export interface PackRegistry {
  dir: string;
  list(): Promise<PackSummary[]>;
  get(id: string): Promise<LoadedPack | null>;
  problems(): Promise<PackLoadResult[]>;
}

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
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
    errors.push(...parsed.error.issues.map((issue) => `pack.json ${issue.path.join('.') || '(root)'}: ${issue.message}`));
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

async function loadPack(dir: string): Promise<PackLoadResult> {
  const id = path.basename(dir);
  const errors: string[] = [];
  const manifest = parseManifest(await readText(path.join(dir, 'pack.json')), id, errors);
  const tokensText = await readText(path.join(dir, 'tokens.json'));
  const designMd = await readText(path.join(dir, DESIGN_MD_FILE));
  if (designMd === null || designMd.trim() === '') errors.push('DESIGN.md is missing or empty');
  if (tokensText === null) errors.push('tokens.json is missing');
  const parsed = tokensText === null ? null : parseTokenFile(tokensText);
  if (parsed?.error) errors.push(parsed.error);
  const compiled = parsed?.file ? compileTokens(parsed.file, { mode: manifest?.mode ?? 'light' }) : null;
  if (compiled) errors.push(...compiled.errors.map((error) => `tokens.json ${error}`));
  if (errors.length > 0 || !manifest || !compiled || !parsed?.file || tokensText === null || designMd === null) {
    return { id, pack: null, errors };
  }
  const summary: PackSummary = { ...manifest, swatches: swatchesOf(compiled.entries) };
  return {
    id,
    errors,
    pack: { dir, manifest, tokensText, tokens: parsed.file, entries: compiled.entries, css: compiled.css, designMd, summary },
  };
}

export async function loadAllPacks(dir: string): Promise<PackLoadResult[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const folders = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name).sort();
  return Promise.all(folders.map((name) => loadPack(path.join(dir, name))));
}

export function createPackRegistry(dir: string = PACKS_DIR): PackRegistry {
  let loading: Promise<PackLoadResult[]> | null = null;
  const load = (): Promise<PackLoadResult[]> => {
    loading ??= loadAllPacks(dir).then((results) => {
      for (const result of results) {
        if (!result.pack) console.error(`[packs] skipping pack ${result.id}: ${result.errors.slice(0, 5).join('; ')}${result.errors.length > 5 ? ` (+${result.errors.length - 5} more)` : ''}`);
      }
      return results;
    });
    return loading;
  };
  return {
    dir,
    async list() {
      return (await load()).flatMap((result) => (result.pack ? [result.pack.summary] : []));
    },
    async get(id) {
      return (await load()).find((result) => result.id === id)?.pack ?? null;
    },
    async problems() {
      return (await load()).filter((result) => result.pack === null);
    },
  };
}

const registries = new Map<string, PackRegistry>();

export function packRegistry(dir: string = PACKS_DIR): PackRegistry {
  const key = path.resolve(dir);
  let registry = registries.get(key);
  if (!registry) {
    registry = createPackRegistry(key);
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
  const base = upsertTokenBlock(pack.designMd, pack.entries).trimEnd();
  const notes = userNotes?.trim();
  return notes ? `${base}\n\n${PROJECT_NOTES_HEADING}\n\n${notes}\n` : `${base}\n`;
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

function addFontLinks(html: string, url: string): string {
  if (html.includes('fonts.googleapis.com')) return html;
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
  const fontsUrl = manifest.fonts.googleFontsUrl;
  if (fontsUrl && (await patchFile(path.join(workTree, 'index.html'), (html) => addFontLinks(html, fontsUrl)))) written.push('index.html');
  return written;
}

interface ApplyPackOptions {
  userDesignMd?: string;
}

export async function applyPack(project: Project, workTree: string, pack: LoadedPack, options: ApplyPackOptions = {}): Promise<string[]> {
  await mkdir(path.join(workTree, DESIGN_SYSTEM_DIR), { recursive: true });
  await writeFileAtomic(path.join(workTree, TOKENS_FILE), pack.tokensText.endsWith('\n') ? pack.tokensText : `${pack.tokensText}\n`);
  await writeFileAtomic(path.join(workTree, PACK_FILE), `${JSON.stringify(pack.manifest, null, 2)}\n`);
  await writeFileAtomic(path.join(workTree, TOKENS_CSS_FILE), pack.css);
  await writeFileAtomic(path.join(workTree, DESIGN_MD_FILE), composeDesignMd(pack, options.userDesignMd));
  const written = [TOKENS_FILE, PACK_FILE, TOKENS_CSS_FILE, DESIGN_MD_FILE];
  if (project.kind === 'react' && (!project.imported || project.imported.created)) written.push(...(await wireReact(workTree, pack.manifest)));
  return written;
}
