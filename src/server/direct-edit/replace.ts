import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type * as t from '@babel/types';
import { z } from 'zod';
import type { Direction, DirectEditRequest, Project, SourceLoc, VersionMeta } from '../../shared/contracts.js';
import {
  SEARCH_PROPERTIES,
  STYLE_REPLACE_MAX,
  STYLE_TOKEN_MAX,
  kindOf,
  locKey,
  type SearchProperty,
  type StyleMatch,
  type StyleReplaceRequest,
  type StyleReplaceResult,
  type StyleSkip,
} from '../../shared/style-search.js';
import { writeAndCommitAll, type WrittenFile } from './batch.js';
import { DirectEditError } from './errors.js';
import { assertCanEdit, patchSource, publishVersion, resolveSource, themeForFile, type DirectEditDeps, type ResolvedSource } from './index.js';
import { findJsxElement, parseSource } from './jsx.js';
import { assertNotMapped, jsxAncestors } from './structure.js';
import type { TailwindTheme, ThemeNamespace } from './tailwind/theme.js';
import { assertKnownTokens, knownTokenVars } from './tokens.js';
import { parseDirectEditRequest } from './validate.js';

const sourceSchema = z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict();
const matchSchema = z
  .object({ source: sourceSchema, selector: z.string().min(1).max(2000), tag: z.string().max(60).optional(), property: z.enum(SEARCH_PROPERTIES as [SearchProperty, ...SearchProperty[]]), repeats: z.number().int().min(1).max(100000).optional() })
  .strict();
const requestSchema = z.object({ matches: z.array(matchSchema).min(1).max(STYLE_REPLACE_MAX), token: z.string().trim().min(1).max(STYLE_TOKEN_MAX) }).strict();

const REASON = {
  mapped: 'made by .map() (one line of code draws every copy)',
  partial: 'shared with copies that use another value',
  dynamic: 'with a className built in code',
  failed: 'that could not be patched',
} as const;
type SkipKind = keyof typeof REASON;

interface Site {
  key: string;
  source: SourceLoc;
  selector: string;
  tag: string | undefined;
  properties: Set<SearchProperty>;
  selectors: Set<string>;
  matches: number;
  repeats: number;
}

interface FileState {
  target: ResolvedSource;
  original: string;
  code: string;
  theme: TailwindTheme | null;
  jsx: ReturnType<typeof parseSource> | null;
}

export interface ReplacePlan {
  changed: WrittenFile[];
  replaced: number;
  sites: number;
  value: string;
  wrote: StyleReplaceResult['wrote'];
  classes: string[];
  skipped: StyleSkip[];
}

function invalid(message: string): DirectEditError {
  return new DirectEditError('invalid_token', message);
}

export function parseStyleReplace(raw: unknown): StyleReplaceRequest {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DirectEditError('invalid_request', issue ? `${issue.path.join('.') || 'replaceStyle'}: ${issue.message}` : 'replaceStyle is not valid');
  }
  return parsed.data;
}

function groupSites(matches: StyleMatch[]): Site[] {
  const sites = new Map<string, Site>();
  for (const match of matches) {
    const key = locKey(match.source);
    let site = sites.get(key);
    if (!site) {
      site = { key, source: match.source, selector: match.selector, tag: match.tag, properties: new Set(), selectors: new Set(), matches: 0, repeats: match.repeats ?? 1 };
      sites.set(key, site);
    }
    site.properties.add(match.property);
    site.selectors.add(match.selector);
    site.matches += 1;
  }
  return [...sites.values()];
}

function varFor(theme: TailwindTheme, ns: ThemeNamespace, name: string): string | null {
  for (const [cssVar, entry] of theme.vars) if (entry.ns === ns && entry.name === name) return `var(${cssVar})`;
  return null;
}

function arbitraryValue(suffix: string): string | null {
  const bracket = /^\[(?:[a-z-]+:)?(.+)\]$/.exec(suffix)?.[1];
  if (bracket) return bracket.replace(/_/g, ' ');
  const shorthand = /^\((?:[a-z-]+:)?(--[A-Za-z0-9_-]+)\)$/.exec(suffix)?.[1];
  return shorthand ? `var(${shorthand})` : null;
}

function colorValue(suffix: string, theme: TailwindTheme): string | null {
  const named = varFor(theme, 'color', suffix);
  if (named) return named;
  const color = theme.colors.find((entry) => entry.name === suffix)?.color;
  return color ? `oklch(${color.l} ${color.c} ${color.h ?? 0})` : null;
}

function scaleValue(map: Map<string, number>, name: string): string | null {
  const px = map.get(name);
  return px === undefined ? null : `${px}px`;
}

function spacingValue(suffix: string, negative: boolean, theme: TailwindTheme): string | null {
  const sign = negative ? '-' : '';
  if (suffix === 'px') return `${sign}1px`;
  const named = theme.spacing.get(suffix);
  if (named !== undefined) return `${sign}${named}px`;
  const steps = Number(suffix);
  return Number.isFinite(steps) ? `${sign}${steps * theme.spacingPx}px` : null;
}

const CLASS_SHAPES: Record<ReturnType<typeof kindOf>, RegExp> = {
  color: /^(?:text|bg|border(?:-[xytrblse])?|fill|stroke|ring|outline|decoration|divide|accent|caret)-(.+)$/,
  'font-size': /^text-(.+)$/,
  radius: /^rounded(?:-(?:tl|tr|br|bl|ss|se|ee|es|[trblse]))?(?:-(.+))?$/,
  spacing: /^(-)?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-(.+)$/,
};

function namedValue(kind: ReturnType<typeof kindOf>, match: RegExpExecArray, theme: TailwindTheme): string | null {
  if (kind === 'spacing') return spacingValue(match[2] ?? '', match[1] === '-', theme);
  const suffix = match[1] ?? '';
  if (kind === 'color') return colorValue(suffix, theme);
  if (kind === 'font-size') return varFor(theme, 'text', suffix) ?? scaleValue(theme.text, suffix);
  if (suffix === 'full') return '9999px';
  if (suffix === 'none') return '0px';
  return varFor(theme, 'radius', suffix) ?? scaleValue(theme.radius, suffix);
}

export function classTokenValue(token: string, property: SearchProperty, theme: TailwindTheme | null): string {
  if (!theme) throw invalid(`${token} is not a CSS variable, and this project has no Tailwind theme. Pass a token such as --primary.`);
  if (token.includes(':')) throw invalid(`Pass ${token} without a variant prefix.`);
  const kind = kindOf(property);
  const match = CLASS_SHAPES[kind].exec(token.replace(/^!|!$/g, ''));
  if (!match) throw invalid(`${token} does not set ${property}.`);
  const suffix = kind === 'spacing' ? (match[2] ?? '') : (match[1] ?? '');
  const value = arbitraryValue(suffix) ?? namedValue(kind, match, theme);
  if (!value) throw invalid(`${token} is not in the Tailwind theme of this project.`);
  return value;
}

export function tokenValue(token: string, property: SearchProperty, theme: TailwindTheme | null): string {
  const trimmed = token.trim();
  if (/^var\(\s*--[A-Za-z0-9_-]+\s*\)$/.test(trimmed)) return trimmed;
  if (/^--[A-Za-z0-9_-]+$/.test(trimmed)) return `var(${trimmed})`;
  return classTokenValue(trimmed, property, theme);
}

async function loadFile(files: Map<string, FileState>, workTree: string, kind: Project['kind'], file: string): Promise<FileState> {
  const target = await resolveSource(workTree, file);
  const existing = files.get(target.file);
  if (existing) return existing;
  const original = await readFile(target.file, 'utf8');
  const extension = path.extname(target.relative).toLowerCase();
  const jsx = extension === '.jsx' || extension === '.tsx' ? parseSource(original, extension === '.tsx') : null;
  const state: FileState = { target, original, code: original, theme: await themeForFile(workTree, target.relative, original, { projectKind: kind }), jsx };
  files.set(target.file, state);
  return state;
}

function isAstNode(value: unknown): value is t.Node {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function childrenOf(node: t.Node): t.Node[] {
  const out: t.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key.endsWith('Comments')) continue;
    const items: unknown[] = Array.isArray(value) ? value : [value];
    out.push(...items.filter(isAstNode));
  }
  return out;
}

function onlyElementOnLine(root: t.Node, line: number): t.JSXElement | null {
  const found: t.JSXElement[] = [];
  const stack: t.Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as t.Node;
    if (node.type === 'JSXElement' && node.openingElement.loc?.start.line === line) found.push(node);
    stack.push(...childrenOf(node));
  }
  return found.length === 1 ? (found[0] ?? null) : null;
}

function isMapped(state: FileState, source: SourceLoc): boolean {
  if (!state.jsx) return false;
  const element = findJsxElement(state.jsx.program, source) ?? onlyElementOnLine(state.jsx.program, source.line);
  if (!element) return false;
  try {
    assertNotMapped(element, jsxAncestors(state.jsx.program, element));
    return false;
  } catch {
    return true;
  }
}

class Skips {
  private readonly byKind = new Map<string, StyleSkip>();

  add(kind: SkipKind | string, site: Site, detail?: string): void {
    const reason = kind in REASON ? REASON[kind as SkipKind] + (detail ? ` (${detail})` : '') : kind;
    const entry = this.byKind.get(reason) ?? { reason, count: 0, sources: [] };
    entry.count += site.selectors.size;
    if (entry.sources.length < 20) entry.sources.push(site.key);
    this.byKind.set(reason, entry);
  }

  list(): StyleSkip[] {
    return [...this.byKind.values()];
  }
}

function siteRequest(site: Site, value: (property: SearchProperty) => string): DirectEditRequest {
  const style = Object.fromEntries([...site.properties].map((property) => [property, value(property)]));
  return parseDirectEditRequest({ source: site.source, selector: site.selector, ...(site.tag ? { tag: site.tag } : {}), style });
}

function dynamicNote(note: string | null): string {
  return (note ?? '').replace(/, so this edit went to inline style\.?$/i, '').replace(/\.$/, '');
}

interface Applied {
  wrote: Set<'classes' | 'inline'>;
  classes: Set<string>;
  replaced: number;
  sites: number;
}

function applySite(state: FileState, site: Site, request: DirectEditRequest, applied: Applied, skips: Skips): void {
  const patch = patchSource(state.target.relative, state.code, request, state.theme);
  if (state.theme && patch.tailwind?.mode === 'inline') return skips.add('dynamic', site, dynamicNote(patch.tailwind.note));
  if (patch.code === state.code) return;
  state.code = patch.code;
  applied.wrote.add(patch.tailwind?.mode === 'classes' ? 'classes' : 'inline');
  for (const cls of patch.tailwind?.classes ?? []) applied.classes.add(cls);
  applied.replaced += site.matches;
  applied.sites += 1;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function byPositionFromEnd(a: Site, b: Site): number {
  return b.source.line - a.source.line || b.source.col - a.source.col;
}

function wroteOf(set: Set<'classes' | 'inline'>): StyleReplaceResult['wrote'] {
  if (set.size === 0) return 'none';
  if (set.size === 2) return 'mixed';
  return set.has('classes') ? 'classes' : 'inline';
}

function assertThemeVars(style: DirectEditRequest['style'], known: Set<string> | null, theme: TailwindTheme | null): void {
  if (known !== null || !theme) return;
  for (const value of Object.values(style ?? {})) {
    const name = value ? /var\(\s*(--[A-Za-z0-9_-]+)/.exec(value)?.[1] : undefined;
    if (name && !theme.vars.has(name)) throw new DirectEditError('unknown_token', `${name} is not a token in the Tailwind theme of this project`);
  }
}

async function planSite(ctx: { files: Map<string, FileState>; workTree: string; kind: Project['kind']; token: string; known: Set<string> | null }, site: Site, skips: Skips) {
  if (site.selectors.size < site.repeats) {
    skips.add('partial', site, `${site.selectors.size} of ${site.repeats}`);
    return null;
  }
  const state = await loadFile(ctx.files, ctx.workTree, ctx.kind, site.source.file);
  if (isMapped(state, site.source)) {
    skips.add('mapped', site);
    return null;
  }
  const request = siteRequest(site, (property) => tokenValue(ctx.token, property, state.theme));
  assertKnownTokens(request.style, ctx.known);
  assertThemeVars(request.style, ctx.known, state.theme);
  return { state, request };
}

export async function planStyleReplace(workTree: string, kind: Project['kind'], raw: unknown): Promise<ReplacePlan> {
  const input = parseStyleReplace(raw);
  const files = new Map<string, FileState>();
  const skips = new Skips();
  const ctx = { files, workTree, kind, token: input.token, known: await knownTokenVars(workTree) };
  const applied: Applied = { wrote: new Set(), classes: new Set(), replaced: 0, sites: 0 };
  let value = input.token;
  for (const site of groupSites(input.matches).sort(byPositionFromEnd)) {
    try {
      const planned = await planSite(ctx, site, skips);
      if (!planned) continue;
      value = Object.values(planned.request.style ?? {})[0] ?? value;
      applySite(planned.state, site, planned.request, applied, skips);
    } catch (error) {
      if (error instanceof DirectEditError && (error.code === 'invalid_token' || error.code === 'unknown_token')) throw error;
      skips.add('failed', site, errorText(error));
    }
  }
  const changed = [...files.values()].filter((state) => state.code !== state.original);
  return { changed, replaced: applied.replaced, sites: applied.sites, value, wrote: wroteOf(applied.wrote), classes: [...applied.classes], skipped: skips.list() };
}

function replaceTitle(plan: ReplacePlan, token: string): string {
  const what = plan.sites === 1 ? '1 element' : `${plan.sites} elements`;
  return `Replace value with ${token} on ${what}`;
}

export async function applyStyleReplace(deps: DirectEditDeps, project: Project, direction: Direction, body: { replaceStyle: unknown }): Promise<StyleReplaceResult> {
  const headVersionId = assertCanEdit(deps, project, direction);
  const input = parseStyleReplace(body.replaceStyle);
  const plan = await planStyleReplace(direction.workTree, project.kind, input);
  const result = { files: plan.changed.map((file) => file.target.relative), replaced: plan.replaced, sites: plan.sites, value: plan.value, wrote: plan.wrote, classes: plan.classes, skipped: plan.skipped };
  if (plan.changed.length === 0) return { ...result, version: await deps.versions.get(project, headVersionId) };
  const meta: VersionMeta = { kind: 'manual', prompt: `Replace style value with ${input.token} on ${plan.sites} element(s)` };
  const version = await writeAndCommitAll(deps, project, direction, plan.changed, replaceTitle(plan, input.token), meta);
  deps.history?.record({
    projectId: project.id,
    directionId: direction.id,
    label: version.title,
    versionId: version.id,
    files: plan.changed.map((file) => ({ file: file.target.file, relative: file.target.relative, before: file.original, after: file.code })),
  });
  await publishVersion(deps, project, direction, version);
  return { ...result, version };
}
