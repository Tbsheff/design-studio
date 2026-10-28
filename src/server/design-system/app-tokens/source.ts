import { readFile, realpath, stat } from 'node:fs/promises';
import type { AppTokenSource, CompiledTokenEntry, DesignSystemState, Direction, Project } from '../../../shared/contracts.js';
import { readDesignSystemFiles } from '../sync.js';
import { findTokenFile, safeFileInside } from './detect.js';
import { readCssTokens, type CssTokenSheet } from './read-css.js';
import { appTokenEntries, buildAppTokens, type AppToken } from './tokens.js';

export interface LoadedAppTokens {
  root: string;
  file: string;
  absolute: string;
  text: string;
  sheet: CssTokenSheet;
  tokens: AppToken[];
  entries: CompiledTokenEntry[];
  summary: AppTokenSource;
}

const cache = new Map<string, { stamp: string; loaded: LoadedAppTokens }>();

export function usesAppTokens(project: Project): boolean {
  return project.imported !== null && project.imported.created !== true && !project.designSystemFor;
}

export function parseAppTokens(root: string, file: string, absolute: string, text: string): LoadedAppTokens {
  const sheet = readCssTokens(text);
  const tokens = buildAppTokens(sheet);
  return {
    root,
    file,
    absolute,
    text,
    sheet,
    tokens,
    entries: appTokenEntries(tokens, file),
    summary: { kind: 'css', file, tailwind: sheet.tailwind, declarations: sheet.declarations.length, tokens: tokens.length, darkTokens: tokens.filter((token) => token.dark).length },
  };
}

export async function readAppTokensAt(root: string, file: string): Promise<LoadedAppTokens | null> {
  const realRoot = await realpath(root).catch(() => null);
  const absolute = realRoot ? await safeFileInside(realRoot, file) : null;
  if (!realRoot || !absolute) return null;
  const info = await stat(absolute);
  const stamp = `${info.mtimeMs}:${info.size}`;
  const cached = cache.get(absolute);
  if (cached?.stamp === stamp && cached.loaded.file === file) return cached.loaded;
  const loaded = parseAppTokens(realRoot, file, absolute, await readFile(absolute, 'utf8'));
  cache.set(absolute, { stamp, loaded });
  return loaded;
}

export async function loadAppTokens(workTree: string): Promise<LoadedAppTokens | null> {
  const file = await findTokenFile(workTree);
  return file ? readAppTokensAt(workTree, file) : null;
}

export async function appTokensFor(project: Project, direction: Direction): Promise<LoadedAppTokens | null> {
  if (!usesAppTokens(project)) return null;
  if (await readDesignSystemFiles(direction.workTree)) return null;
  return loadAppTokens(direction.workTree);
}

export function appTokenState(loaded: LoadedAppTokens): DesignSystemState {
  return { packId: null, manifest: null, tokens: null, entries: loaded.entries, css: null, errors: [], source: loaded.summary };
}
