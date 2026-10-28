import type { Direction, Project, TokenChange, TokenPreviewResult, UpdateTokensResult, Version, VersionMeta } from '../../../shared/contracts.js';
import { DirectEditError, assertCanEdit, publishVersion } from '../../direct-edit/index.js';
import type { DirectEditDeps } from '../../direct-edit/index.js';
import { readSnapshot, restoreSnapshots } from '../create-token.js';
import { writeFileAtomic } from '../packs.js';
import { parseTokenChanges } from '../token-changes.js';
import { recordTokenEdit, snapshotChanges } from '../token-history.js';
import { tokensTitle } from '../update-tokens.js';
import type { CssDeclaration, CssTokenBlock } from './read-css.js';
import { appTokenState, appTokensFor, parseAppTokens, readAppTokensAt, type LoadedAppTokens } from './source.js';
import type { AppToken } from './tokens.js';

const MAX_VALUE = 400;
const UNSAFE = /[;{}<>\u0000-\u001f\u007f]|\/\*|\*\//;
const DARK_SELECTOR = '.dark, [data-theme="dark"]';

interface Splice {
  start: number;
  end: number;
  text: string;
}

function invalid(message: string): DirectEditError {
  return new DirectEditError('invalid_request', message);
}

function normalized(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function balanced(value: string): boolean {
  let depth = 0;
  let quote: string | null = null;
  for (const char of value) {
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth += 1;
    else if (char === ')' && --depth < 0) return false;
  }
  return depth === 0 && quote === null;
}

function checkCssValue(label: string, value: string): string {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > MAX_VALUE) throw invalid(`${label} must be 1 to ${MAX_VALUE} characters`);
  if (UNSAFE.test(trimmed)) throw invalid(`${label} "${trimmed}" must not contain ; { } < >, comments or line breaks`);
  if (!balanced(trimmed)) throw invalid(`${label} "${trimmed}" has unbalanced brackets or quotes`);
  return normalized(trimmed);
}

function tokenOf(loaded: LoadedAppTokens, change: TokenChange): AppToken {
  const token = loaded.tokens.find((item) => item.path === change.path || item.name === change.path);
  if (!token) throw new DirectEditError('unknown_token', `${change.path} is not a token in ${loaded.file}`, 404);
  return token;
}

function lineStart(text: string, offset: number): number {
  return text.lastIndexOf('\n', offset - 1) + 1;
}

function lineEnd(text: string, offset: number): number {
  const next = text.indexOf('\n', offset);
  return next === -1 ? text.length : next + 1;
}

function indentOf(text: string, decl: CssDeclaration | undefined): string {
  if (!decl) return '  ';
  const start = lineStart(text, decl.declStart);
  return /^[ \t]*/.exec(text.slice(start, decl.declStart))?.[0] || '  ';
}

function insertDark(loaded: LoadedAppTokens, token: AppToken, value: string): Splice {
  const block: CssTokenBlock | undefined = loaded.sheet.blocks.filter((item) => item.scope === 'dark').at(-1);
  if (!block) throw invalid(`${loaded.file} has no .dark block to add a dark value for ${token.name}`);
  const last = loaded.sheet.declarations.filter((decl) => decl.start > block.open && decl.end < block.close).at(-1);
  const text = loaded.text;
  const before = lineStart(text, block.close);
  const onOwnLine = text.slice(before, block.close).trim() === '';
  const line = `${indentOf(text, last)}${token.name}: ${value};\n`;
  return onOwnLine ? { start: before, end: before, text: line } : { start: block.close, end: block.close, text: `\n${line}` };
}

function removeDecl(text: string, decl: CssDeclaration): Splice {
  const start = lineStart(text, decl.declStart);
  const end = lineEnd(text, decl.declEnd);
  const rest = text.slice(start, decl.declStart) + text.slice(decl.declEnd, end);
  return rest.trim() === '' ? { start, end, text: '' } : { start: decl.declStart, end: decl.declEnd, text: '' };
}

function splicesFor(loaded: LoadedAppTokens, change: TokenChange): Splice[] {
  const token = tokenOf(loaded, change);
  const out: Splice[] = [];
  if (change.value !== undefined) {
    const value = checkCssValue(`${change.path} value`, change.value);
    if (!token.light) throw invalid(`${change.path} has no light declaration in ${loaded.file}`);
    if (value !== token.light.value) out.push({ start: token.light.start, end: token.light.end, text: value });
  }
  if (change.darkValue === null) {
    if (token.dark) out.push(removeDecl(loaded.text, token.dark));
  } else if (change.darkValue !== undefined) {
    const value = checkCssValue(`${change.path} dark value`, change.darkValue);
    if (!token.dark) out.push(insertDark(loaded, token, value));
    else if (value !== token.dark.value) out.push({ start: token.dark.start, end: token.dark.end, text: value });
  }
  return out;
}

function applySplices(text: string, splices: Splice[]): string {
  const ordered = [...splices].sort((a, b) => b.start - a.start);
  let out = text;
  let floor = Number.POSITIVE_INFINITY;
  for (const splice of ordered) {
    if (splice.end > floor) throw invalid('two token changes touch the same declaration');
    out = out.slice(0, splice.start) + splice.text + out.slice(splice.end);
    floor = splice.start;
  }
  return out;
}

function expected(token: AppToken, change: TokenChange | undefined): { light: string | null; dark: string | null } {
  const light = change?.value !== undefined ? normalized(change.value) : (token.light?.value ?? null);
  const dark = change?.darkValue === undefined ? (token.dark?.value ?? null) : change.darkValue === null ? null : normalized(change.darkValue);
  return { light, dark };
}

function verify(before: LoadedAppTokens, after: LoadedAppTokens, changes: TokenChange[]): void {
  const byName = new Map(changes.map((change) => [tokenOf(before, change).name, change]));
  const fail = () => new DirectEditError('tokens_invalid', `${before.file} could not be edited in place`);
  if (after.tokens.length !== before.tokens.length) throw fail();
  for (const token of before.tokens) {
    const next = after.tokens.find((item) => item.name === token.name);
    const want = expected(token, byName.get(token.name));
    if (!next || (next.light?.value ?? null) !== want.light || (next.dark?.value ?? null) !== want.dark) throw fail();
  }
}

export function plannedCssText(loaded: LoadedAppTokens, changes: TokenChange[]): string {
  const next = applySplices(loaded.text, changes.flatMap((change) => splicesFor(loaded, change)));
  if (next === loaded.text) return next;
  verify(loaded, parseAppTokens(loaded.root, loaded.file, loaded.absolute, next), changes);
  return next;
}

function updateMeta(loaded: LoadedAppTokens, changes: TokenChange[]): VersionMeta {
  const parts = changes.map((change) => {
    const name = tokenOf(loaded, change).name;
    const bits = [change.value !== undefined ? `= ${change.value}` : '', change.darkValue === null ? '(remove dark)' : change.darkValue !== undefined ? `(dark ${change.darkValue})` : ''];
    return `${name} ${bits.filter(Boolean).join(' ')}`;
  });
  return { kind: 'manual', prompt: `Update tokens in ${loaded.file}: ${parts.join('; ')}` };
}

async function writeAndCommit(deps: DirectEditDeps, project: Project, direction: Direction, loaded: LoadedAppTokens, text: string, changes: TokenChange[]): Promise<Version> {
  const workTree = direction.workTree;
  const snapshot = await readSnapshot(workTree, loaded.file);
  try {
    await writeFileAtomic(loaded.absolute, text);
    const title = tokensTitle(changes.map((change) => tokenOf(loaded, change).name));
    const version = await deps.versions.commitFile(project, direction, [loaded.file], title, updateMeta(loaded, changes));
    if (version === null) throw new DirectEditError('no_change', 'The token changes did not change any tracked file');
    recordTokenEdit(deps, project, direction, version, await snapshotChanges(workTree, [snapshot]));
    return version;
  } catch (error) {
    await restoreSnapshots(workTree, [snapshot]);
    throw error;
  }
}

export async function updateAppTokens(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<UpdateTokensResult | null> {
  const found = await appTokensFor(project, direction);
  if (!found) return null;
  const changes = parseTokenChanges(raw);
  assertCanEdit(deps, project, direction);
  const loaded = await readAppTokensAt(direction.workTree, found.file);
  if (!loaded) throw new DirectEditError('no_design_system', 'The token file is gone');
  const text = plannedCssText(loaded, changes);
  if (text === loaded.text) throw new DirectEditError('no_change', 'The token values are already set');
  const version = await writeAndCommit(deps, project, direction, loaded, text, changes);
  await publishVersion(deps, project, direction, version);
  const fresh = await readAppTokensAt(direction.workTree, found.file);
  return { state: fresh ? appTokenState(fresh) : appTokenState(loaded), version };
}

function declarations(lines: string[]): string {
  return lines.map((line) => `  ${line}`).join('\n');
}

export function previewAppTokens(loaded: LoadedAppTokens, raw: unknown): TokenPreviewResult {
  const changes = parseTokenChanges(raw);
  const light: string[] = [];
  const dark: string[] = [];
  const errors: string[] = [];
  for (const change of changes) {
    try {
      const token = tokenOf(loaded, change);
      const value = change.value !== undefined ? checkCssValue(`${change.path} value`, change.value) : null;
      if (value !== null) light.push(`${token.name}: ${value};`);
      if (change.darkValue === null) dark.push(`${token.name}: ${value ?? token.light?.value ?? token.value};`);
      else if (change.darkValue !== undefined) dark.push(`${token.name}: ${checkCssValue(`${change.path} dark value`, change.darkValue)};`);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (errors.length > 0) return { css: '', errors };
  const blocks = [light.length > 0 ? `:root {\n${declarations(light)}\n}` : '', dark.length > 0 ? `${DARK_SELECTOR} {\n${declarations(dark)}\n}` : ''];
  return { css: blocks.filter(Boolean).join('\n'), errors: [] };
}
