import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { PACK_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import type { TokenFile, TokenPreviewResult } from '../../shared/contracts.js';
import { DirectEditError } from '../direct-edit/index.js';
import { compileTokens, parseTokenFile } from './compile.js';
import type { ThemeMode } from './compile.js';
import { readManifest } from './sync.js';
import { applyTokenChanges, parseTokenChanges, validateTokenChanges } from './token-changes.js';

interface TokenSource {
  stamp: string;
  file: TokenFile | null;
  error: string | null;
  mode: ThemeMode;
}

const cache = new Map<string, TokenSource>();

async function stampOf(file: string): Promise<string | null> {
  try {
    const info = await stat(file);
    return `${info.mtimeMs}:${info.size}`;
  } catch {
    return null;
  }
}

async function readSource(workTree: string, stamp: string): Promise<TokenSource> {
  const [text, manifest] = await Promise.all([readFile(path.join(workTree, TOKENS_FILE), 'utf8'), readManifest(workTree)]);
  const parsed = parseTokenFile(text);
  return { stamp, file: parsed.file, error: parsed.error, mode: manifest?.mode === 'dark' ? 'dark' : 'light' };
}

async function loadTokenSource(workTree: string): Promise<TokenSource | null> {
  const key = path.resolve(workTree);
  const [tokens, pack] = await Promise.all([stampOf(path.join(key, TOKENS_FILE)), stampOf(path.join(key, PACK_FILE))]);
  if (tokens === null || pack === null) {
    cache.delete(key);
    return null;
  }
  const stamp = `${tokens}|${pack}`;
  const cached = cache.get(key);
  if (cached?.stamp === stamp) return cached;
  const source = await readSource(key, stamp);
  cache.set(key, source);
  return source;
}

export function invalidateTokenSource(workTree: string): void {
  cache.delete(path.resolve(workTree));
}

export function invalidateTokenSourceOnChange(workTree: string, paths: string[]): void {
  if (paths.includes(TOKENS_FILE) || paths.includes(PACK_FILE)) invalidateTokenSource(workTree);
}

export async function previewTokens(workTree: string, raw: unknown): Promise<TokenPreviewResult> {
  const changes = parseTokenChanges(raw);
  const source = await loadTokenSource(workTree);
  if (source === null) throw new DirectEditError('no_design_system', 'This direction has no design system');
  if (source.file === null) throw new DirectEditError('tokens_invalid', source.error ?? 'tokens.json is invalid');
  validateTokenChanges(source.file, changes);
  const next = applyTokenChanges(source.file, changes);
  const compiled = compileTokens(next, { mode: source.mode, only: new Set(changes.map((change) => change.path)) });
  if (compiled.errors.length > 0) return { css: '', errors: compiled.errors };
  return { css: compiled.css, errors: [] };
}
