import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { cssImports, customProperties, parseCss, resolveVars } from './css.js';
import type { CssRule } from './css.js';
import { FetchBlockedError } from './safe-fetch.js';
import type { FetchedResource } from './safe-fetch.js';
import type { Candidate, Harvest } from './types.js';
import { candidate, candidatesFromVars } from './vars.js';
import { chromaOf, colorsInText, lengthPx, lightnessOf, normalizeColor, normalizeLength, normalizeShadow, safeGoogleFontsUrl } from './values.js';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

export type Fetcher = (url: string, kind: 'page' | 'css', deadline?: number) => Promise<FetchedResource>;

export const MAX_STYLESHEETS = 20;
export const URL_TOTAL_MS = 20_000;

export class SiteTimeLimitError extends Error {}

function limitText(totalMs: number): string {
  return `${Math.max(1, Math.round(totalMs / 1000))} s`;
}

function beforeDeadline<T>(work: Promise<T>, deadline: number, label: string): Promise<T> {
  const left = deadline - Date.now();
  if (left <= 0) return Promise.reject(new SiteTimeLimitError(label));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new SiteTimeLimitError(label)), left);
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
}

export interface UrlSnapshot {
  url: string;
  html: string;
  stylesheets: Array<{ url: string; css: string }>;
  failures: string[];
}

export interface UrlHarvest {
  harvest: Harvest;
  snapshot: UrlSnapshot;
}

interface PageParts {
  links: string[];
  inline: string[];
  styleAttrs: CssRule[];
  themeColor: string | null;
  fontLinks: string[];
  darkHint: boolean;
}

function attr(element: Element, name: string): string | null {
  return element.attrs.find((item) => item.name === name)?.value ?? null;
}

function textOf(element: Element): string {
  return element.childNodes.map((child) => ('value' in child && child.nodeName === '#text' ? child.value : '')).join('');
}

function walk(node: Node, visit: (element: Element) => void): void {
  if ('tagName' in node) visit(node);
  const children = 'childNodes' in node ? node.childNodes : [];
  for (const child of children) walk(child, visit);
  if ('content' in node && node.content) walk(node.content as Node, visit);
}

function pageParts(html: string): PageParts {
  const parts: PageParts = { links: [], inline: [], styleAttrs: [], themeColor: null, fontLinks: [], darkHint: false };
  walk(parse(html), (element) => {
    const tag = element.tagName;
    if (tag === 'html') {
      const theme = `${attr(element, 'class') ?? ''} ${attr(element, 'data-theme') ?? ''} ${attr(element, 'data-color-mode') ?? ''}`.toLowerCase();
      if (/\bdark\b/.test(theme)) parts.darkHint = true;
    }
    if (tag === 'link') {
      const rel = (attr(element, 'rel') ?? '').toLowerCase().split(/\s+/);
      const href = attr(element, 'href');
      if (!href) return;
      if (href.includes('fonts.googleapis.com/css')) parts.fontLinks.push(href);
      else if (rel.includes('stylesheet')) parts.links.push(href);
    }
    if (tag === 'style') parts.inline.push(textOf(element));
    if (tag === 'meta' && (attr(element, 'name') ?? '').toLowerCase() === 'theme-color') parts.themeColor = attr(element, 'content');
    const style = attr(element, 'style');
    if (style && style.length < 4000) {
      const classes = (attr(element, 'class') ?? '').split(/\s+/).filter(Boolean).map((name) => `.${name}`).join('');
      const rules = parseCss(`${tag}${classes}{${style}}`);
      parts.styleAttrs.push(...rules);
    }
  });
  return parts;
}

function absolute(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

interface SiteClock {
  deadline: number;
  totalMs: number;
}

function sheetFailure(url: string, error: unknown, clock: SiteClock): string {
  if (error instanceof SiteTimeLimitError) return `${url}: stopped, the ${limitText(clock.totalMs)} limit for this site ran out`;
  if (error instanceof FetchBlockedError) return `${url}: blocked (${error.message})`;
  return `${url}: ${error instanceof Error ? error.message : String(error)}`;
}

async function readSheet(url: string, fetcher: Fetcher, clock: SiteClock): Promise<{ sheet: { url: string; css: string }; imports: string[] }> {
  const fetched = await beforeDeadline(fetcher(url, 'css', clock.deadline), clock.deadline, url);
  const css = fetched.body.toString('utf8');
  const imports = cssImports(css)
    .map((imported) => absolute(imported, fetched.url))
    .filter((next): next is string => next !== null && !next.includes('fonts.googleapis.com'));
  return { sheet: { url: fetched.url, css }, imports };
}

async function loadStylesheets(first: string[], base: string, fetcher: Fetcher, failures: string[], clock: SiteClock): Promise<Array<{ url: string; css: string }>> {
  const queue = first.map((href) => absolute(href, base)).filter((url): url is string => url !== null);
  const seen = new Set<string>();
  const out: Array<{ url: string; css: string }> = [];
  while (queue.length > 0 && seen.size < MAX_STYLESHEETS) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    if (Date.now() >= clock.deadline) {
      failures.push(`${queue.length + 1} stylesheet(s) not read: the ${limitText(clock.totalMs)} limit for this site ran out`);
      break;
    }
    seen.add(url);
    try {
      const { sheet, imports } = await readSheet(url, fetcher, clock);
      out.push(sheet);
      queue.push(...imports);
    } catch (error) {
      failures.push(sheetFailure(url, error, clock));
    }
  }
  return out;
}

const BUTTONISH = /(^|[\s>+~,(])(button|\.btn|\.button|\[type=["']?submit|\.cta|\.primary)\b/i;
const LINKISH = /(^|[\s>+~,])a(\b|:|$)/;
const CARDISH = /\.(card|panel|tile|box)\b/i;
const MUTEDISH = /\.(muted|text-muted|subtle|secondary|caption|meta)\b|(^|[\s,])(small|figcaption)\b/i;
const INPUTISH = /(^|[\s,])(input|textarea|select)\b|\.(input|form-control|field)\b/i;
const HEADINGISH = /(^|[\s,])h[1-3]\b/i;
const CODEISH = /(^|[\s,])(code|pre|kbd|samp)\b/i;
const BODYISH = /^(html|body|:root)$/i;

function firstColor(value: string): string | null {
  for (const raw of [value, ...colorsInText(value)]) {
    const color = normalizeColor(raw.trim());
    if (color) return color;
  }
  return null;
}

class Tally {
  private counts = new Map<string, number>();
  add(value: string | null): void {
    if (value) this.counts.set(value, (this.counts.get(value) ?? 0) + 1);
  }
  ranked(filter: (value: string) => boolean = () => true): string[] {
    return [...this.counts.entries()].filter(([value]) => filter(value)).sort((a, b) => b[1] - a[1]).map(([value]) => value);
  }
}

function blurOf(shadow: string): number {
  const lengths = shadow.match(/-?\d*\.?\d+px/g) ?? [];
  return lengths.length >= 3 ? Math.abs(parseFloat(lengths[2] ?? '0')) : 0;
}

interface Tallies {
  bodyBg: Tally;
  bodyFg: Tally;
  buttonBg: Tally;
  buttonFg: Tally;
  linkFg: Tally;
  cardBg: Tally;
  muted: Tally;
  borders: Tally;
  allColors: Tally;
  radii: Tally;
  buttonRadius: Tally;
  shadows: Tally;
  fontBody: Tally;
  fontDisplay: Tally;
  fontMono: Tally;
}

interface Decl {
  selector: string;
  body: boolean;
  prop: string;
  value: string;
}

function newTallies(): Tallies {
  const names: Array<keyof Tallies> = ['bodyBg', 'bodyFg', 'buttonBg', 'buttonFg', 'linkFg', 'cardBg', 'muted', 'borders', 'allColors', 'radii', 'buttonRadius', 'shadows', 'fontBody', 'fontDisplay', 'fontMono'];
  return Object.fromEntries(names.map((name) => [name, new Tally()])) as unknown as Tallies;
}

function tallyBackground(t: Tallies, decl: Decl, color: string | null): void {
  if (decl.body) t.bodyBg.add(color);
  if (BUTTONISH.test(decl.selector)) t.buttonBg.add(color);
  if (CARDISH.test(decl.selector)) t.cardBg.add(color);
}

function tallyText(t: Tallies, decl: Decl, color: string | null): void {
  if (decl.body) t.bodyFg.add(color);
  if (BUTTONISH.test(decl.selector)) t.buttonFg.add(color);
  if (LINKISH.test(decl.selector)) t.linkFg.add(color);
  if (MUTEDISH.test(decl.selector)) t.muted.add(color);
}

function tallyColor(t: Tallies, decl: Decl): void {
  const isBg = decl.prop === 'background' || decl.prop === 'background-color';
  if (!isBg && decl.prop !== 'color' && !decl.prop.startsWith('border')) return;
  const color = firstColor(decl.value);
  t.allColors.add(color);
  if (isBg) tallyBackground(t, decl, color);
  if (decl.prop === 'color') tallyText(t, decl, color);
  if ((decl.prop === 'border' || decl.prop === 'border-color') && (INPUTISH.test(decl.selector) || CARDISH.test(decl.selector))) t.borders.add(color);
}

function tallyShape(t: Tallies, decl: Decl): void {
  if (decl.prop === 'box-shadow') t.shadows.add(normalizeShadow(decl.value));
  if (decl.prop !== 'border-radius') return;
  const length = normalizeLength(decl.value.split(/\s+/)[0] ?? '');
  t.radii.add(length);
  if (length && BUTTONISH.test(decl.selector)) t.buttonRadius.add(length);
  if (/^(50%|9999px|999px|100px)$/.test(decl.value.trim())) t.radii.add('9999px');
}

function tallyFont(t: Tallies, decl: Decl): void {
  if (decl.prop !== 'font-family' && decl.prop !== 'font') return;
  const family = decl.prop === 'font' ? (decl.value.split(/\d+(?:\.\d+)?(?:px|rem|em|%)(?:\s*\/\s*\S+)?\s+/).pop() ?? '') : decl.value;
  if (decl.body) t.fontBody.add(family);
  if (HEADINGISH.test(decl.selector)) t.fontDisplay.add(family);
  if (CODEISH.test(decl.selector)) t.fontMono.add(family);
}

function tallyRules(rules: CssRule[], root: Map<string, string>): Tallies {
  const t = newTallies();
  for (const rule of rules) {
    const body = rule.selector.split(',').some((part) => BODYISH.test(part.trim()));
    for (const [prop, raw] of rule.decls) {
      if (prop.startsWith('--')) continue;
      const decl: Decl = { selector: rule.selector, body, prop, value: resolveVars(raw, [root]) };
      tallyColor(t, decl);
      tallyShape(t, decl);
      tallyFont(t, decl);
    }
  }
  return t;
}

type Push = (token: string, value: string | undefined, evidence: string) => void;

const saturated = (value: string) => chromaOf(value) > 0.04;

function pushColors(t: Tallies, page: PageParts, push: Push): void {
  push('color.bg', t.bodyBg.ranked()[0], 'body background');
  push('color.fg', t.bodyFg.ranked()[0], 'body text color');
  push('color.primary', t.buttonBg.ranked(saturated)[0], 'button background');
  push('color.primary-fg', t.buttonFg.ranked()[0], 'button text color');
  push('color.primary', t.linkFg.ranked(saturated)[0], 'link color');
  const theme = page.themeColor ? normalizeColor(page.themeColor) : null;
  if (theme && saturated(theme)) push('color.primary', theme, 'meta theme-color');
  push('color.primary', t.allColors.ranked(saturated)[0], 'most used saturated color');
  push('color.surface', t.cardBg.ranked()[0], 'card background');
  push('color.fg-muted', t.muted.ranked()[0], 'muted text color');
  push('color.border', t.borders.ranked()[0], 'input or card border');
}

function pushFonts(t: Tallies, push: Push): void {
  push('font.body', t.fontBody.ranked()[0], 'body font-family');
  push('font.display', t.fontDisplay.ranked()[0], 'heading font-family');
  push('font.mono', t.fontMono.ranked()[0], 'code font-family');
}

function pushRadii(t: Tallies, push: Push): void {
  push('radius.md', t.buttonRadius.ranked()[0], 'button border-radius');
  const sorted = t.radii.ranked((value) => value !== '9999px' && lengthPx(value) > 0).sort((a, b) => lengthPx(a) - lengthPx(b));
  if (sorted.length >= 3) {
    push('radius.sm', sorted[0], 'smallest border-radius');
    push('radius.md', sorted[Math.floor(sorted.length / 2)], 'middle border-radius');
    push('radius.lg', sorted.at(-1), 'largest border-radius');
  }
  if (t.radii.ranked((value) => value === '9999px').length > 0) push('radius.pill', '9999px', 'pill border-radius');
}

function pushShadows(t: Tallies, push: Push): void {
  const sorted = t.shadows.ranked().slice(0, 6).sort((a, b) => blurOf(a) - blurOf(b));
  if (sorted.length < 2) return;
  push('shadow.sm', sorted[0], 'smallest box-shadow');
  push('shadow.lg', sorted.at(-1), 'largest box-shadow');
  if (sorted.length >= 3) push('shadow.md', sorted[Math.floor(sorted.length / 2)], 'middle box-shadow');
}

function usageCandidates(rules: CssRule[], root: Map<string, string>, page: PageParts, label: string): Candidate[] {
  const t = tallyRules(rules, root);
  const out: Candidate[] = [];
  const push: Push = (token, value, evidence) => {
    if (value === undefined) return;
    const found = candidate({ token, confidence: 'medium' }, { value }, 'url', `${label}: ${evidence}`, 'medium');
    if (found) out.push(found);
  };
  pushColors(t, page, push);
  pushFonts(t, push);
  pushRadii(t, push);
  pushShadows(t, push);
  return out;
}

async function fetchPage(url: string, fetcher: Fetcher, clock: SiteClock) {
  try {
    return await beforeDeadline(fetcher(url, 'page', clock.deadline), clock.deadline, url);
  } catch (error) {
    if (error instanceof SiteTimeLimitError) throw new Error(`${url} did not answer within ${limitText(clock.totalMs)}`);
    throw error;
  }
}

export async function harvestUrl(url: string, fetcher: Fetcher, totalMs = URL_TOTAL_MS): Promise<UrlHarvest> {
  const clock: SiteClock = { deadline: Date.now() + totalMs, totalMs };
  const page = await fetchPage(url, fetcher, clock);
  const type = page.contentType.toLowerCase();
  if (type !== '' && !type.includes('html') && !type.includes('xml')) throw new Error(`${page.url} is not an HTML page (${type.split(';')[0]})`);
  const html = page.body.toString('utf8');
  const parts = pageParts(html);
  const failures: string[] = [];
  const stylesheets = await loadStylesheets([...parts.links, ...parts.inline.flatMap((css) => cssImports(css))], page.url, fetcher, failures, clock);
  const rules = [...parts.inline, ...stylesheets.map((sheet) => sheet.css)].flatMap((css) => parseCss(css)).concat(parts.styleAttrs);
  const props = customProperties(rules);
  const label = new URL(page.url).host;
  const candidates = [...candidatesFromVars(props, 'url', label), ...usageCandidates(rules, props.root, parts, label)];
  const googleFontsUrl = parts.fontLinks.map((href) => safeGoogleFontsUrl(href)).find((value): value is string => value !== null);
  const bg = candidates.find((item) => item.token === 'color.bg' && item.value)?.value;
  const darkHint = parts.darkHint || (bg !== undefined && (lightnessOf(bg) ?? 1) < 0.35);
  return {
    harvest: { source: 'url', label: page.url, candidates, ...(googleFontsUrl ? { googleFontsUrl } : {}), darkHint },
    snapshot: { url: page.url, html, stylesheets, failures },
  };
}
