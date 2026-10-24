import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseColor } from 'culori';
import type { CompiledTokenEntry, DesignSystemCheckProblem, DesignSystemCheckResult, DesignSystemCheckRule, PackManifest, TokenFile } from '../../shared/contracts.js';
import { PACK_FILE, REQUIRED_TOKENS, TOKENS_FILE } from '../../shared/contracts.js';
import { isNodeError } from '../store/errors.js';
import { compileTokens, parseTokenFile } from './compile.js';
import { splitDesignMd } from './design-md.js';
import { DESIGN_MD_SECTIONS, TODO_MARK } from './extract/compose.js';
import { parseCss } from './extract/css.js';
import { KIT_PAGE_FILE } from './extract/kit-page.js';
import { SYSTEM_FAMILIES } from './extract/map.js';
import { pageParts } from './extract/url.js';
import { COLOR_IN_TEXT, contrast, primaryFamily } from './extract/values.js';
import { DESIGN_MD_FILE, manifestSchema } from './packs.js';

export const AA_CONTRAST = 4.5;
const LISTED_PER_RULE = 8;
const FIXED_PAIRS: Array<[ink: string, fill: string]> = [
  ['fg', 'bg'],
  ['fg-muted', 'bg'],
  ['fg', 'surface'],
];
const COLOR_PROPS = /color|background|border|outline|fill|stroke|shadow|caret|decoration/i;
const NOT_COLORS = new Set(['transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'none', 'revert', 'auto']);
const TODO_LINE = new RegExp(`^\\s*(?:[-*]\\s+)?${TODO_MARK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm');

type Mode = 'light' | 'dark';

export interface DesignSystemFiles {
  tokensText: string | null;
  manifestText: string | null;
  designMd: string | null;
  kitHtml: string | null;
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function readDesignSystemCheckFiles(workTree: string): Promise<DesignSystemFiles> {
  const [tokensText, manifestText, designMd, kitHtml] = await Promise.all([TOKENS_FILE, PACK_FILE, DESIGN_MD_FILE, KIT_PAGE_FILE].map((file) => readOptional(path.join(workTree, file))));
  return { tokensText: tokensText ?? null, manifestText: manifestText ?? null, designMd: designMd ?? null, kitHtml: kitHtml ?? null };
}

class Problems {
  readonly list: DesignSystemCheckProblem[] = [];
  private readonly counts = new Map<DesignSystemCheckRule, number>();

  add(rule: DesignSystemCheckRule, message: string): void {
    const count = (this.counts.get(rule) ?? 0) + 1;
    this.counts.set(rule, count);
    if (count <= LISTED_PER_RULE) this.list.push({ rule, message });
  }

  finish(): DesignSystemCheckProblem[] {
    for (const [rule, count] of this.counts) {
      if (count > LISTED_PER_RULE) this.list.push({ rule, message: `${count - LISTED_PER_RULE} more ${rule} problem(s) not listed.` });
    }
    return this.list;
  }
}

function readManifest(text: string | null, problems: Problems): PackManifest | null {
  if (text === null) {
    problems.add('tokens', `${PACK_FILE} is missing.`);
    return null;
  }
  try {
    const parsed = manifestSchema.safeParse(JSON.parse(text));
    if (parsed.success) return parsed.data as PackManifest;
    problems.add('tokens', `${PACK_FILE} is not a valid pack manifest.`);
  } catch {
    problems.add('tokens', `${PACK_FILE} is not valid JSON.`);
  }
  return null;
}

interface RawToken {
  $value?: unknown;
  $extensions?: { 'studio.modes'?: { dark?: unknown } };
}

function rawToken(file: TokenFile, group: string, name: string): RawToken | null {
  const node = (file[group] as Record<string, unknown> | undefined)?.[name];
  return typeof node === 'object' && node !== null ? (node as RawToken) : null;
}

function isOklchOrAlias(value: unknown): boolean {
  return typeof value === 'string' && (/^\s*oklch\(/i.test(value) || /^\s*\{[^}]+\}\s*$/.test(value));
}

function checkColorFormat(file: TokenFile, mode: Mode, problems: Problems): void {
  for (const name of REQUIRED_TOKENS.color) {
    const token = rawToken(file, 'color', name);
    if (!token) continue;
    if (!isOklchOrAlias(token.$value)) problems.add('tokens', `color.${name} must be an OKLCH value (oklch(L% C H)) or an alias.`);
    if (mode === 'dark') continue;
    const dark = token.$extensions?.['studio.modes']?.dark;
    if (dark === undefined) problems.add('tokens', `color.${name} has no dark value ($extensions["studio.modes"].dark).`);
    else if (!isOklchOrAlias(dark)) problems.add('tokens', `color.${name} dark value must be OKLCH or an alias.`);
  }
}

function compileFile(text: string | null, mode: Mode, problems: Problems): { file: TokenFile; entries: CompiledTokenEntry[] } | null {
  if (text === null) {
    problems.add('tokens', `${TOKENS_FILE} is missing.`);
    return null;
  }
  const parsed = parseTokenFile(text);
  if (!parsed.file) {
    problems.add('tokens', parsed.error ?? `${TOKENS_FILE} is invalid.`);
    return null;
  }
  const compiled = compileTokens(parsed.file, { mode });
  for (const error of compiled.errors) problems.add('tokens', `${TOKENS_FILE}: ${error}`);
  return { file: parsed.file, entries: compiled.entries };
}

export function valueInMode(entries: CompiledTokenEntry[], entry: CompiledTokenEntry, mode: Mode): string {
  const byVar = new Map(entries.map((item) => [item.cssVar, item]));
  let current = entry;
  for (let depth = 0; depth <= entries.length; depth += 1) {
    const value = mode === 'dark' ? (current.darkValue ?? current.value) : current.value;
    const alias = /^var\((--[A-Za-z0-9_-]+)\)$/.exec(value.trim());
    const next = alias ? byVar.get(alias[1] ?? '') : undefined;
    if (!next) return value;
    current = next;
  }
  return current.value;
}

function contrastPairs(entries: CompiledTokenEntry[]): Array<[ink: string, fill: string]> {
  const colors = new Set(entries.filter((entry) => entry.path.startsWith('color.')).map((entry) => entry.path.slice('color.'.length)));
  const fgPairs = [...colors].filter((name) => name.endsWith('-fg') && colors.has(name.slice(0, -3))).map((name): [string, string] => [name, name.slice(0, -3)]);
  return [...FIXED_PAIRS.filter(([ink, fill]) => colors.has(ink) && colors.has(fill)), ...fgPairs];
}

function checkContrast(entries: CompiledTokenEntry[], packMode: Mode, problems: Problems): void {
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));
  const modes: Mode[] = packMode === 'dark' ? ['dark'] : ['light', 'dark'];
  for (const mode of modes) {
    for (const [ink, fill] of contrastPairs(entries)) {
      const inkValue = valueInMode(entries, byPath.get(`color.${ink}`)!, mode);
      const fillValue = valueInMode(entries, byPath.get(`color.${fill}`)!, mode);
      const ratio = contrast(inkValue, fillValue);
      if (ratio >= AA_CONTRAST) continue;
      const label = packMode === 'dark' ? '' : ` in ${mode} mode`;
      problems.add('contrast', ratio === 0 ? `--${ink} on --${fill}${label}: cannot read one of the colors.` : `--${ink} on --${fill}${label} is ${ratio.toFixed(2)}:1; AA needs ${AA_CONTRAST}:1.`);
    }
  }
}

function sectionBodies(prose: string): Map<string, string> {
  const bodies = new Map<string, string>();
  let current: string | null = null;
  let inFence = false;
  for (const line of prose.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const heading = inFence ? null : /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      current = (heading[1] ?? '').toLowerCase();
      bodies.set(current, bodies.get(current) ?? '');
    } else if (current !== null) {
      bodies.set(current, `${bodies.get(current)}${line}\n`);
    }
  }
  return bodies;
}

function checkDesignMd(designMd: string | null, problems: Problems): void {
  if (designMd === null || designMd.trim() === '') {
    problems.add('design-md', `${DESIGN_MD_FILE} is missing or empty.`);
    return;
  }
  const prose = splitDesignMd(designMd).prose;
  const bodies = sectionBodies(prose);
  for (const section of DESIGN_MD_SECTIONS) {
    const body = bodies.get(section.toLowerCase());
    if (body === undefined) problems.add('design-md', `${DESIGN_MD_FILE} has no "## ${section}" section.`);
    else if (body.trim() === '') problems.add('design-md', `"## ${section}" in ${DESIGN_MD_FILE} is empty.`);
  }
  const todos = prose.split('\n').filter((line) => TODO_LINE.test(line));
  for (const line of todos) problems.add('design-md', `${DESIGN_MD_FILE} still has a to-do line: ${line.trim().slice(0, 120)}`);
}

function namedColors(value: string): string[] {
  return value
    .replace(/var\([^)]*\)/g, ' ')
    .split(/[\s,()/]+/)
    .filter((word) => /^[a-z]+$/i.test(word) && !NOT_COLORS.has(word.toLowerCase()) && parseColor(word) !== undefined);
}

function rawColorsIn(prop: string, value: string): string[] {
  const literals = [...value.matchAll(COLOR_IN_TEXT)].map((match) => match[0]);
  return COLOR_PROPS.test(prop) ? [...literals, ...namedColors(value)] : literals;
}

function checkKitColors(kitHtml: string | null, problems: Problems): string[] {
  if (kitHtml === null) {
    problems.add('kit-colors', `${KIT_PAGE_FILE} (the kit page) is missing.`);
    return [];
  }
  const parts = pageParts(kitHtml);
  const rules = [...parts.inline.flatMap((css) => parseCss(css)), ...parts.styleAttrs];
  for (const rule of rules) {
    for (const [prop, value] of rule.decls) {
      for (const literal of rawColorsIn(prop, value)) problems.add('kit-colors', `${KIT_PAGE_FILE} ${rule.selector} { ${prop}: ${value.trim().slice(0, 80)} } uses the raw color ${literal}; use a var(--token).`);
    }
  }
  return parts.fontLinks;
}

export function familiesInFontLinks(hrefs: string[]): string[] {
  const names: string[] = [];
  for (const href of hrefs) {
    try {
      for (const family of new URL(href.replace(/&amp;/g, '&')).searchParams.getAll('family')) names.push((family.split(':')[0] ?? '').replace(/\+/g, ' ').trim());
    } catch {
      continue;
    }
  }
  return [...new Set(names.filter(Boolean))];
}

function webFamily(name: string | null): string | null {
  return name && !SYSTEM_FAMILIES.has(name.toLowerCase()) ? name : null;
}

function tokenFamilies(entries: CompiledTokenEntry[]): Record<'display' | 'body' | 'mono', string | null> {
  const family = (name: string) => {
    const entry = entries.find((item) => item.path === `font.${name}`);
    return entry ? primaryFamily(valueInMode(entries, entry, 'light')) : null;
  };
  return { display: family('display'), body: family('body'), mono: family('mono') };
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function checkFonts(entries: CompiledTokenEntry[], fontLinks: string[] | null, manifest: PackManifest | null, problems: Problems): void {
  const families = tokenFamilies(entries);
  const web = [...new Set(Object.values(families).map(webFamily).filter((name): name is string => name !== null))];
  if (fontLinks !== null) {
    const linked = familiesInFontLinks(fontLinks);
    for (const name of web) if (!linked.some((item) => sameName(item, name))) problems.add('fonts', `The font ${name} is in tokens.json but not in the Google Fonts <link> of ${KIT_PAGE_FILE}.`);
    for (const name of linked) if (!web.some((item) => sameName(item, name))) problems.add('fonts', `The Google Fonts <link> of ${KIT_PAGE_FILE} loads ${name}, which no font token uses.`);
  }
  if (!manifest) return;
  for (const role of ['display', 'body', 'mono'] as const) {
    const token = families[role];
    if (token && !sameName(token, manifest.fonts[role])) problems.add('fonts', `${PACK_FILE} fonts.${role} is ${manifest.fonts[role]}, but font.${role} in tokens.json is ${token}.`);
  }
  const packLinked = familiesInFontLinks(manifest.fonts.googleFontsUrl ? [manifest.fonts.googleFontsUrl] : []);
  for (const name of web) if (!packLinked.some((item) => sameName(item, name))) problems.add('fonts', `${PACK_FILE} fonts.googleFontsUrl does not load ${name}.`);
}

export function checkDesignSystemFiles(files: DesignSystemFiles, options: { kitPage?: boolean } = {}): DesignSystemCheckResult {
  const problems = new Problems();
  const manifest = readManifest(files.manifestText, problems);
  const mode: Mode = manifest?.mode ?? 'light';
  const compiled = compileFile(files.tokensText, mode, problems);
  if (compiled) {
    checkColorFormat(compiled.file, mode, problems);
    checkContrast(compiled.entries, mode, problems);
  }
  checkDesignMd(files.designMd, problems);
  const fontLinks = options.kitPage === false ? null : checkKitColors(files.kitHtml, problems);
  if (compiled) checkFonts(compiled.entries, fontLinks, manifest, problems);
  const list = problems.finish();
  return { passed: list.length === 0, problems: list };
}

export async function checkDesignSystem(workTree: string): Promise<DesignSystemCheckResult> {
  return checkDesignSystemFiles(await readDesignSystemCheckFiles(workTree));
}

export function describeCheck(result: DesignSystemCheckResult): string {
  if (result.passed) return 'Design system check passed: tokens, contrast (AA, light and dark), DESIGN.md sections, kit page colors and fonts.';
  return [`Design system check failed: ${result.problems.length} problem(s).`, ...result.problems.map((problem) => `- [${problem.rule}] ${problem.message}`)].join('\n');
}
