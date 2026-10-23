import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PACK_FILE, TOKENS_CSS_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import type { CompiledTokenEntry, PackManifest, TokenFile } from '../../shared/contracts.js';
import { createKeyedMutex } from '../store/mutex.js';
import { compileTokens, parseTokenFile } from './compile.js';
import type { ThemeMode } from './compile.js';
import { upsertTokenBlock } from './design-md.js';
import { DESIGN_MD_FILE, writeFileAtomic } from './packs.js';

interface SyncResult {
  present: boolean;
  changed: string[];
  errors: string[];
}

export interface DesignSystemFiles {
  tokens: TokenFile | null;
  manifest: PackManifest | null;
  entries: CompiledTokenEntry[];
  css: string | null;
  errors: string[];
}

const lock = createKeyedMutex();

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if ((error as { code?: unknown }).code === 'ENOENT') return null;
    throw error;
  }
}

export async function readManifest(workTree: string): Promise<PackManifest | null> {
  const text = await readOptional(path.join(workTree, PACK_FILE));
  if (text === null) return null;
  try {
    return JSON.parse(text) as PackManifest;
  } catch {
    return null;
  }
}

function modeOf(manifest: PackManifest | null): ThemeMode {
  return manifest?.mode === 'dark' ? 'dark' : 'light';
}

export async function hasTokensFile(workTree: string): Promise<boolean> {
  const [tokens, manifest] = await Promise.all([readOptional(path.join(workTree, TOKENS_FILE)), readOptional(path.join(workTree, PACK_FILE))]);
  return tokens !== null && manifest !== null;
}

export async function readDesignSystemFiles(workTree: string): Promise<DesignSystemFiles | null> {
  const text = await readOptional(path.join(workTree, TOKENS_FILE));
  if (text === null || (await readOptional(path.join(workTree, PACK_FILE))) === null) return null;
  const manifest = await readManifest(workTree);
  const parsed = parseTokenFile(text);
  if (!parsed.file) return { tokens: null, manifest, entries: [], css: null, errors: [parsed.error ?? 'tokens.json is invalid'] };
  const compiled = compileTokens(parsed.file, { mode: modeOf(manifest) });
  return { tokens: parsed.file, manifest, entries: compiled.entries, css: compiled.css, errors: compiled.errors };
}

async function writeIfChanged(workTree: string, relative: string, content: string): Promise<boolean> {
  const file = path.join(workTree, relative);
  if ((await readOptional(file)) === content) return false;
  await writeFileAtomic(file, content);
  return true;
}

async function syncDesignMd(workTree: string, entries: CompiledTokenEntry[]): Promise<boolean> {
  const current = await readOptional(path.join(workTree, DESIGN_MD_FILE));
  if (current === null) return false;
  return writeIfChanged(workTree, DESIGN_MD_FILE, upsertTokenBlock(current, entries));
}

async function syncUnlocked(workTree: string): Promise<SyncResult> {
  const files = await readDesignSystemFiles(workTree);
  if (!files) return { present: false, changed: [], errors: [] };
  if (files.errors.length > 0 || files.css === null) return { present: true, changed: [], errors: files.errors };
  const changed: string[] = [];
  if (await writeIfChanged(workTree, TOKENS_CSS_FILE, files.css)) changed.push(TOKENS_CSS_FILE);
  if (await syncDesignMd(workTree, files.entries)) changed.push(DESIGN_MD_FILE);
  return { present: true, changed, errors: [] };
}

export function syncDesignSystem(workTree: string): Promise<SyncResult> {
  return lock(path.resolve(workTree), () => syncUnlocked(workTree));
}

export function buildErrorMessage(errors: string[]): string {
  const shown = errors.slice(0, 8).join('; ');
  const more = errors.length > 8 ? ` (and ${errors.length - 8} more)` : '';
  return `design-system/tokens.json does not compile: ${shown}${more}`;
}
