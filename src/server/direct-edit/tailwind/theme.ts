import { DEFAULT_BREAKPOINTS } from '../../../shared/variants.js';
import { createRequire } from 'node:module';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Oklch } from 'culori';
import { findTokenFile, safeFileInside } from '../../design-system/app-tokens/detect.js';
import { readCssTokens, type CssDeclaration, type CssTokenSheet } from '../../design-system/app-tokens/read-css.js';
import { buildAppTokens, type AppToken } from '../../design-system/app-tokens/tokens.js';
import { parseColor } from './color.js';
import { lengthToPx, plainNumber, emValue } from './units.js';

export type TailwindVersion = 3 | 4;
export type ThemeNamespace = 'color' | 'spacing' | 'text' | 'radius' | 'font-weight' | 'leading' | 'tracking' | 'shadow' | 'font';

export interface ThemeColor {
  name: string;
  color: Oklch | null;
  project: boolean;
  rank: number;
}

export interface TailwindTheme {
  version: TailwindVersion;
  spacingPx: number;
  spacing: Map<string, number>;
  text: Map<string, number>;
  radius: Map<string, number>;
  fontWeight: Map<string, number>;
  leading: Map<string, number>;
  tracking: Map<string, number>;
  shadow: Map<string, string>;
  font: Map<string, string>;
  colors: ThemeColor[];
  colorNames: Set<string>;
  vars: Map<string, { ns: ThemeNamespace; name: string }>;
  breakpoints: Map<string, number>;
}

const V3_DEFAULTS = `@theme default {
  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem; --text-lg: 1.125rem; --text-xl: 1.25rem; --text-2xl: 1.5rem;
  --text-3xl: 1.875rem; --text-4xl: 2.25rem; --text-5xl: 3rem; --text-6xl: 3.75rem; --text-7xl: 4.5rem; --text-8xl: 6rem; --text-9xl: 8rem;
  --font-weight-thin: 100; --font-weight-extralight: 200; --font-weight-light: 300; --font-weight-normal: 400; --font-weight-medium: 500;
  --font-weight-semibold: 600; --font-weight-bold: 700; --font-weight-extrabold: 800; --font-weight-black: 900;
  --tracking-tighter: -0.05em; --tracking-tight: -0.025em; --tracking-normal: 0em; --tracking-wide: 0.025em; --tracking-wider: 0.05em; --tracking-widest: 0.1em;
  --leading-none: 1; --leading-tight: 1.25; --leading-snug: 1.375; --leading-normal: 1.5; --leading-relaxed: 1.625; --leading-loose: 2;
  --radius-none: 0px; --radius-sm: 0.125rem; --radius-DEFAULT: 0.25rem; --radius-md: 0.375rem; --radius-lg: 0.5rem; --radius-xl: 0.75rem; --radius-2xl: 1rem; --radius-3xl: 1.5rem;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05); --shadow-DEFAULT: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  --font-sans: ui-sans-serif, system-ui, sans-serif; --font-serif: ui-serif, Georgia, serif; --font-mono: ui-monospace, monospace;
}`;

const V4_FALLBACK = `@theme default {
  --spacing: 0.25rem;
  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem; --text-lg: 1.125rem; --text-xl: 1.25rem; --text-2xl: 1.5rem;
  --text-3xl: 1.875rem; --text-4xl: 2.25rem; --text-5xl: 3rem; --text-6xl: 3.75rem; --text-7xl: 4.5rem; --text-8xl: 6rem; --text-9xl: 8rem;
  --font-weight-thin: 100; --font-weight-extralight: 200; --font-weight-light: 300; --font-weight-normal: 400; --font-weight-medium: 500;
  --font-weight-semibold: 600; --font-weight-bold: 700; --font-weight-extrabold: 800; --font-weight-black: 900;
  --tracking-tighter: -0.05em; --tracking-tight: -0.025em; --tracking-normal: 0em; --tracking-wide: 0.025em; --tracking-wider: 0.05em; --tracking-widest: 0.1em;
  --leading-tight: 1.25; --leading-snug: 1.375; --leading-normal: 1.5; --leading-relaxed: 1.625; --leading-loose: 2;
  --radius-xs: 0.125rem; --radius-sm: 0.25rem; --radius-md: 0.375rem; --radius-lg: 0.5rem; --radius-xl: 0.75rem; --radius-2xl: 1rem; --radius-3xl: 1.5rem; --radius-4xl: 2rem;
  --shadow-2xs: 0 1px rgb(0 0 0 / 0.05); --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  --font-sans: ui-sans-serif, system-ui, sans-serif; --font-serif: ui-serif, Georgia, serif; --font-mono: ui-monospace, monospace;
  --color-black: #000; --color-white: #fff;
}`;

const CSS_CANDIDATES = ['src/index.css', 'src/App.css', 'src/app.css', 'src/main.css', 'src/styles.css', 'src/style.css', 'src/globals.css', 'src/styles/globals.css', 'src/app/globals.css', 'app/globals.css', 'styles/globals.css', 'src/tailwind.css', 'app/tailwind.css', 'index.css', 'styles.css'];
const CONFIG_FILES = ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts'];
const WALK_DIRS = ['src', 'app', 'styles'];
const WALK_LIMIT = 400;
const DETECT_TTL_MS = 3000;
const TAILWIND_IMPORT = /@import\s+(?:url\()?["']tailwindcss(?:\/[^"']*)?["']/;
const TAILWIND_V3 = /@tailwind\s+(base|components|utilities)\b/;
const HTML_V3 = /cdn\.tailwindcss\.com/i;
const HTML_V4 = /@tailwindcss\/browser/i;
const HTML_STYLE = /<style[^>]*type\s*=\s*["']text\/tailwindcss["'][^>]*>([\s\S]*?)<\/style>/gi;

interface Detection {
  version: TailwindVersion;
  cssFile: string | null;
}

interface CacheEntry {
  at: number;
  stamp: string;
  detection: Detection | null;
  theme: TailwindTheme | null;
}

const cache = new Map<string, CacheEntry>();
let defaultSheets: { v4: string; v3: string } | null = null;

function majorOf(range: unknown): TailwindVersion | null {
  if (typeof range !== 'string') return null;
  const match = /(\d+)/.exec(range);
  if (!match) return range.includes('latest') || range.includes('next') ? 4 : null;
  return Number(match[1]) >= 4 ? 4 : 3;
}

async function readText(file: string | null): Promise<string | null> {
  if (!file) return null;
  return readFile(file, 'utf8').catch(() => null);
}

async function packageVersion(root: string): Promise<TailwindVersion | null> {
  const text = await readText(await safeFileInside(root, 'package.json'));
  if (!text) return null;
  try {
    const pkg = JSON.parse(text) as Record<string, Record<string, unknown> | undefined>;
    const deps = { ...pkg.devDependencies, ...pkg.dependencies, ...pkg.peerDependencies };
    if (deps['@tailwindcss/vite'] !== undefined || deps['@tailwindcss/postcss'] !== undefined) return 4;
    return majorOf(deps.tailwindcss);
  } catch {
    return null;
  }
}

async function walkCss(root: string): Promise<string[]> {
  const out: string[] = [];
  let seen = 0;
  const visit = async (dir: string, depth: number): Promise<void> => {
    if (depth > 4 || seen > WALK_LIMIT) return;
    const entries = await readdir(path.join(root, dir), { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      seen += 1;
      if (seen > WALK_LIMIT) return;
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.isSymbolicLink()) continue;
      const relative = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await visit(relative, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.css')) out.push(relative);
    }
  };
  for (const dir of WALK_DIRS) await visit(dir, 0);
  return out;
}

async function findTailwindCss(root: string): Promise<{ file: string; version: TailwindVersion } | null> {
  const tokenFile = await findTokenFile(root).catch(() => null);
  const ordered = [...new Set([...(tokenFile ? [tokenFile] : []), ...CSS_CANDIDATES, ...(await walkCss(root))])];
  let v3: string | null = null;
  for (const relative of ordered) {
    const text = await readText(await safeFileInside(root, relative));
    if (!text) continue;
    if (TAILWIND_IMPORT.test(text)) return { file: relative, version: 4 };
    if (v3 === null && TAILWIND_V3.test(text)) v3 = relative;
  }
  return v3 ? { file: v3, version: 3 } : null;
}

async function hasConfig(root: string): Promise<boolean> {
  for (const name of CONFIG_FILES) if (await safeFileInside(root, name)) return true;
  return false;
}

async function detect(root: string): Promise<Detection | null> {
  const css = await findTailwindCss(root);
  if (css) return { version: css.version, cssFile: css.file };
  const fromPackage = await packageVersion(root);
  if (fromPackage) return { version: fromPackage, cssFile: null };
  return (await hasConfig(root)) ? { version: 3, cssFile: null } : null;
}

async function stampOf(root: string, cssFile: string | null): Promise<string> {
  const files = ['package.json', ...CONFIG_FILES, ...(cssFile ? [cssFile] : [])];
  const parts = await Promise.all(files.map(async (name) => {
    const info = await stat(path.join(root, name)).catch(() => null);
    return info ? `${name}:${info.mtimeMs}:${info.size}` : '';
  }));
  return parts.join('|');
}

async function bundledThemeCss(): Promise<string | null> {
  try {
    const main = createRequire(import.meta.url).resolve('tailwindcss');
    return await readText(path.join(path.dirname(main), '..', 'theme.css'));
  } catch {
    return null;
  }
}

async function defaults(root: string, version: TailwindVersion): Promise<string> {
  if (version === 3) return V3_DEFAULTS;
  const local = await readText(await safeFileInside(root, 'node_modules/tailwindcss/theme.css'));
  if (local) return local;
  defaultSheets ??= { v4: (await bundledThemeCss()) ?? V4_FALLBACK, v3: V3_DEFAULTS };
  return defaultSheets.v4;
}

function isThemeDecl(decl: CssDeclaration | null | undefined): boolean {
  return decl?.scope === 'theme';
}

function namespaceOf(name: string): { ns: ThemeNamespace; key: string } | null {
  if (name.slice(2).includes('--')) return null;
  const rules: Array<[RegExp, ThemeNamespace]> = [
    [/^--color-(.+)$/, 'color'],
    [/^--spacing-(.+)$/, 'spacing'],
    [/^--text-(.+)$/, 'text'],
    [/^--radius-(.+)$/, 'radius'],
    [/^--font-weight-(.+)$/, 'font-weight'],
    [/^--leading-(.+)$/, 'leading'],
    [/^--tracking-(.+)$/, 'tracking'],
    [/^--shadow-(.+)$/, 'shadow'],
    [/^--font-(.+)$/, 'font'],
  ];
  for (const [pattern, ns] of rules) {
    const match = pattern.exec(name);
    if (match?.[1]) return { ns, key: match[1] };
  }
  return null;
}

function emptyTheme(version: TailwindVersion): TailwindTheme {
  return {
    version,
    spacingPx: 4,
    spacing: new Map(),
    text: new Map(),
    radius: new Map(),
    fontWeight: new Map(),
    leading: new Map(),
    tracking: new Map(),
    shadow: new Map(),
    font: new Map(),
    colors: [],
    colorNames: new Set(),
    vars: new Map(),
    breakpoints: new Map(),
  };
}

function mergedSheet(sheets: Array<{ sheet: CssTokenSheet; project: boolean }>): { sheet: CssTokenSheet; projectNames: Set<string> } {
  const declarations: CssDeclaration[] = [];
  const projectNames = new Set<string>();
  for (const { sheet, project } of sheets) {
    for (const decl of sheet.declarations) {
      declarations.push(decl);
      if (project) projectNames.add(decl.name);
    }
  }
  return { sheet: { declarations, blocks: [], tailwind: true, themeBlocks: 1 }, projectNames };
}

function addColor(theme: TailwindTheme, name: string, value: string, project: boolean, rank = 2): void {
  if (theme.colorNames.has(name)) theme.colors = theme.colors.filter((entry) => entry.name !== name);
  theme.colorNames.add(name);
  theme.colors.push({ name, color: parseColor(value)?.color ?? null, project, rank });
}

type ScaleSlot = [keyof Pick<TailwindTheme, 'spacing' | 'text' | 'radius' | 'fontWeight' | 'leading' | 'tracking'>, (value: string) => number | null];

const SCALES: Partial<Record<ThemeNamespace, ScaleSlot>> = {
  spacing: ['spacing', lengthToPx],
  text: ['text', lengthToPx],
  radius: ['radius', lengthToPx],
  'font-weight': ['fontWeight', plainNumber],
  leading: ['leading', plainNumber],
  tracking: ['tracking', emValue],
};

function addToken(theme: TailwindTheme, ns: ThemeNamespace, key: string, value: string, project: boolean, rank = 2): void {
  if (key === '*') return;
  const name = key === 'DEFAULT' ? '' : key;
  if (ns === 'color') return addColor(theme, name, value, project, rank);
  const scale = SCALES[ns];
  if (scale) {
    const parsed = scale[1](value);
    if (parsed !== null) theme[scale[0]].set(name, parsed);
    return;
  }
  (ns === 'shadow' ? theme.shadow : theme.font).set(name, value);
}

const V3_COLOR_VAR = /^--([a-z][a-z0-9-]*)$/;
const VAR_ALIAS = /^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/;

function addThemeToken(theme: TailwindTheme, token: AppToken, spot: { ns: ThemeNamespace; key: string }, project: boolean): void {
  const raw = token.lights.filter(isThemeDecl).at(-1)?.value ?? '';
  const alias = VAR_ALIAS.exec(raw)?.[1];
  addToken(theme, spot.ns, spot.key, token.value, project, alias ? (alias.startsWith('--color-') ? 1 : 0) : 2);
  theme.vars.set(token.name, { ns: spot.ns, name: spot.key === 'DEFAULT' ? '' : spot.key });
  if (alias && !theme.vars.has(alias)) theme.vars.set(alias, { ns: spot.ns, name: spot.key });
}

function addV3Color(theme: TailwindTheme, token: AppToken): void {
  const name = V3_COLOR_VAR.exec(token.name)?.[1];
  if (!name || token.type !== 'color') return;
  addColor(theme, name, token.value, true, 0);
  theme.vars.set(token.name, { ns: 'color', name });
}

const BREAKPOINT_VAR = /^--breakpoint-([a-z0-9][a-z0-9-]*)$/;

function addBreakpoint(theme: TailwindTheme, name: string, value: string): void {
  const px = lengthToPx(value);
  if (px === null) theme.breakpoints.delete(name);
  else theme.breakpoints.set(name, px);
}

export function buildTheme(version: TailwindVersion, defaultCss: string, projectCss: string[]): TailwindTheme {
  const theme = emptyTheme(version);
  const sheets = [{ sheet: readCssTokens(defaultCss), project: false }, ...projectCss.map((css) => ({ sheet: readCssTokens(css), project: true }))];
  const { sheet, projectNames } = mergedSheet(sheets);
  for (const token of buildAppTokens(sheet)) {
    const inTheme = token.lights.some(isThemeDecl);
    const project = projectNames.has(token.name);
    const spot = namespaceOf(token.name);
    const breakpoint = inTheme ? BREAKPOINT_VAR.exec(token.name)?.[1] : undefined;
    if (token.name === '--spacing' && inTheme) theme.spacingPx = lengthToPx(token.value) ?? theme.spacingPx;
    else if (breakpoint) addBreakpoint(theme, breakpoint, token.value);
    else if (inTheme && spot) addThemeToken(theme, token, spot, project);
    else if (version === 3 && project && !spot) addV3Color(theme, token);
  }
  for (const [name, value] of Object.entries({ black: '#000', white: '#fff' })) {
    if (!theme.colorNames.has(name)) addColor(theme, name, value, false);
  }
  if (theme.breakpoints.size === 0) for (const entry of DEFAULT_BREAKPOINTS) theme.breakpoints.set(entry.name, entry.px);
  return theme;
}

export function htmlTailwindVersion(html: string): TailwindVersion | null {
  if (HTML_V4.test(html)) return 4;
  if (HTML_V3.test(html)) return 3;
  return /type\s*=\s*["']text\/tailwindcss["']/i.test(html) ? 4 : null;
}

function htmlThemeCss(html: string): string[] {
  return [...html.matchAll(HTML_STYLE)].map((match) => match[1] ?? '');
}

async function projectTheme(root: string): Promise<TailwindTheme | null> {
  const now = Date.now();
  const cached = cache.get(root);
  if (cached && now - cached.at < DETECT_TTL_MS) return cached.theme;
  const detection = cached && now - cached.at < DETECT_TTL_MS * 10 ? cached.detection : await detect(root);
  const stamp = await stampOf(root, detection?.cssFile ?? null);
  if (cached && cached.stamp === stamp && cached.detection?.cssFile === detection?.cssFile) {
    cache.set(root, { ...cached, at: now });
    return cached.theme;
  }
  let theme: TailwindTheme | null = null;
  if (detection) {
    const css = detection.cssFile ? await readText(await safeFileInside(root, detection.cssFile)) : null;
    theme = buildTheme(detection.version, await defaults(root, detection.version), css ? [css] : []);
  }
  cache.set(root, { at: now, stamp, detection, theme });
  return theme;
}

export interface ThemeScope {
  projectKind: 'html' | 'react';
}

export async function tailwindThemeFor(workTree: string, file: { relative: string; text: string } | null, scope: ThemeScope): Promise<TailwindTheme | null> {
  const isHtml = file !== null && /\.html?$/i.test(file.relative);
  if (isHtml && file) {
    const inline = htmlTailwindVersion(file.text);
    if (inline) return buildTheme(inline, await defaults(workTree, inline), htmlThemeCss(file.text));
    if (scope.projectKind === 'html') return null;
  }
  return projectTheme(workTree);
}

export async function projectTailwindTheme(workTree: string): Promise<TailwindTheme | null> {
  return projectTheme(workTree);
}

export async function defaultTailwindTheme(): Promise<TailwindTheme> {
  defaultSheets ??= { v4: (await bundledThemeCss()) ?? V4_FALLBACK, v3: V3_DEFAULTS };
  return buildTheme(4, defaultSheets.v4, []);
}
