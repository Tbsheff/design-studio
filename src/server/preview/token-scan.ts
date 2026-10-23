import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CompiledTokenEntry, DirectStyleProperty, QualityFinding, TokenMatch } from '../../shared/contracts.js';
import { TOKEN_GROUP_FOR_PROPERTY } from '../../shared/contracts.js';
import { isSnappable, matchColor, matchDimension } from '../../shared/token-match.js';

const SOURCE_EXT = /\.(html|css|tsx|jsx)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'design-system', 'dist']);
const DECLARATION = /(?<![\w-])(color|background-color|background|border-color|border|font-size|gap|row-gap|column-gap|padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?)\s*:\s*([^;{}"'\n]+)/g;
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|lab|lch)\([^)]*\)/g;
const LENGTH_LITERAL = /(?<![\w.-])-?\d*\.?\d+(?:px|rem)\b/g;
const MAX_FILES = 40;

interface TokenScanFile {
  path: string;
  text: string;
}

function normalizeProperty(prop: string): DirectStyleProperty | null {
  if (prop === 'background' || prop === 'background-color') return 'background-color';
  if (prop === 'border' || prop === 'border-color') return 'border-color';
  if (prop === 'padding') return 'padding-top';
  if (prop === 'margin') return 'margin-top';
  if (prop === 'row-gap' || prop === 'column-gap') return 'gap';
  return prop in TOKEN_GROUP_FOR_PROPERTY ? (prop as DirectStyleProperty) : null;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let at = text.indexOf('\n'); at !== -1 && at < index; at = text.indexOf('\n', at + 1)) line += 1;
  return line;
}

function bestColor(literal: string, entries: CompiledTokenEntry[]): TokenMatch | null {
  const best = matchColor(literal, entries)[0];
  return isSnappable('color', best) ? best : null;
}

function bestLength(literal: string, prop: DirectStyleProperty, entries: CompiledTokenEntry[]): TokenMatch | null {
  const group = TOKEN_GROUP_FOR_PROPERTY[prop];
  if (!group || group === 'color' || group === 'font') return null;
  const best = matchDimension(literal, entries, group)[0];
  return best?.exact ? best : null;
}

function literalsFor(prop: DirectStyleProperty, value: string): string[] {
  const pattern = TOKEN_GROUP_FOR_PROPERTY[prop] === 'color' ? COLOR_LITERAL : LENGTH_LITERAL;
  return [...value.matchAll(pattern)].map((match) => match[0]).filter((literal) => !/^-?0(px|rem)?$/.test(literal));
}

function matchLiteral(literal: string, prop: DirectStyleProperty, entries: CompiledTokenEntry[]): TokenMatch | null {
  return TOKEN_GROUP_FOR_PROPERTY[prop] === 'color' ? bestColor(literal, entries) : bestLength(literal, prop, entries);
}

function declarationFindings(file: TokenScanFile, match: RegExpMatchArray, entries: CompiledTokenEntry[]): QualityFinding[] {
  const prop = normalizeProperty(match[1] ?? '');
  const value = match[2] ?? '';
  if (!prop || value.includes('var(')) return [];
  const source = `${file.path}:${lineOf(file.text, match.index ?? 0)}`;
  return literalsFor(prop, value).flatMap((literal) => {
    const token = matchLiteral(literal, prop, entries);
    if (!token) return [];
    return [{ check: 'tokens' as const, severity: 'medium' as const, viewport: null, selector: null, source, message: `${match[1]}: ${literal} is a raw value where the token ${token.cssVar} (${token.value}) exists.`, fix: `Use var(${token.cssVar}).` }];
  });
}

export function scanTokenUse(files: TokenScanFile[], entries: CompiledTokenEntry[]): QualityFinding[] {
  if (entries.length === 0) return [];
  return files.flatMap((file) => [...file.text.matchAll(DECLARATION)].flatMap((match) => declarationFindings(file, match, entries)));
}

async function walk(root: string, dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) await walk(root, full, out);
    else if (entry.isFile() && SOURCE_EXT.test(entry.name)) out.push(path.relative(root, full).split(path.sep).join('/'));
  }
}

export async function readScanFiles(workTree: string): Promise<TokenScanFile[]> {
  const relative: string[] = [];
  await walk(workTree, workTree, relative);
  return Promise.all(relative.map(async (file) => ({ path: file, text: await readFile(path.join(workTree, file), 'utf8') })));
}
