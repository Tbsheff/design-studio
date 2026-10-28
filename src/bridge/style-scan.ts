import { SOURCE_LOC_ATTR, type SourceLoc } from '../shared/contracts.js';
import {
  INHERITED_PROPERTIES,
  STYLE_SCAN_MAX_HITS,
  STYLE_SELECT_MAX,
  classForProperty,
  isStyleKind,
  kindOf,
  isUnsetComputed,
  queryProperties,
  sameValue,
  type SearchProperty,
  type StyleHit,
  type StyleQuery,
  type StyleScanResult,
} from '../shared/style-search.js';
import { appSourceFor, appSourceMode } from './app-source.js';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'LINK', 'META', 'BASE', 'TITLE', 'HEAD', 'HTML', 'BR']);
const MAX_ELEMENTS = 6000;
const MAX_APP_LOOKUPS = 400;
const APP_LOOKUPS = appSourceMode() === 'next';
const LOC = /^(.+):(\d+):(\d+)$/;

export type SelectorOf = (element: Element) => string;

function parseLoc(raw: string | null): SourceLoc | null {
  const match = raw ? LOC.exec(raw) : null;
  return match ? { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) } : null;
}

const KIND_PROBE: Record<string, string> = { color: 'color', 'font-size': 'font-size', radius: 'border-top-left-radius', spacing: 'padding-top' };

function probeProperty(property: StyleQuery['property'], value: string): string {
  if (property && isStyleKind(property)) return KIND_PROBE[property] ?? 'padding-top';
  if (property) return KIND_PROBE[kindOf(property)] ?? 'padding-top';
  return CSS.supports('color', value) ? 'color' : 'padding-top';
}

export function normalizeValue(value: string, property: StyleQuery['property']): string {
  const trimmed = value.trim();
  const prop = probeProperty(property, trimmed);
  const probe = document.createElement('div');
  probe.style.setProperty(prop, trimmed);
  if (!probe.style.getPropertyValue(prop)) return trimmed;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const out = getComputedStyle(probe).getPropertyValue(prop);
  probe.remove();
  return out || trimmed;
}

function hasBorder(style: CSSStyleDeclaration): boolean {
  return ['top', 'right', 'bottom', 'left'].some((side) => parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 && style.getPropertyValue(`border-${side}-style`) !== 'none');
}

function applies(property: SearchProperty, style: CSSStyleDeclaration): boolean {
  if (property === 'border-color') return hasBorder(style);
  if (property === 'gap') return /flex|grid/.test(style.display);
  return true;
}

function classListOf(element: Element): string[] {
  const raw = element.getAttribute('class');
  return raw ? raw.trim().split(/\s+/) : [];
}

interface Candidate {
  element: Element;
  property: SearchProperty;
  value: string;
  cls: string | null;
  inline: string | null;
}

function ownValue(element: Element, property: SearchProperty, style: CSSStyleDeclaration, parentStyle: CSSStyleDeclaration | null, classes: string[]): Candidate | null {
  if (!applies(property, style)) return null;
  const value = style.getPropertyValue(property).trim();
  if (isUnsetComputed(property, value)) return null;
  const cls = classForProperty(classes, property);
  if (cls && /-auto!?$/.test(cls)) return null;
  const inline = element instanceof HTMLElement || element instanceof SVGElement ? element.style.getPropertyValue(property) || null : null;
  if (INHERITED_PROPERTIES.has(property) && !cls && !inline && parentStyle && sameValue(parentStyle.getPropertyValue(property), value)) return null;
  return { element, property, value, cls, inline };
}

function wanted(candidate: Candidate, query: StyleQuery, value: string | null): boolean {
  if (value !== null && !sameValue(candidate.value, value)) return false;
  if (query.className && candidate.cls !== query.className) return false;
  return true;
}

function scopeElements(query: StyleQuery): Element[] {
  if (!query.within || query.within.length === 0) return Array.from(document.body.querySelectorAll('*'));
  const out: Element[] = [];
  for (const selector of query.within) {
    try {
      const found = document.querySelector(selector);
      if (found) out.push(found);
    } catch {
      continue;
    }
  }
  return out;
}

function isScanned(element: Element): boolean {
  return !SKIP_TAGS.has(element.tagName) && !element.id.startsWith('studio-') && element.getClientRects().length > 0;
}

function collect(query: StyleQuery, value: string | null): { candidates: Candidate[]; truncated: boolean } {
  const properties = queryProperties(query.property);
  const candidates: Candidate[] = [];
  const elements = scopeElements(query).filter(isScanned).slice(0, MAX_ELEMENTS);
  for (const element of elements) {
    const style = getComputedStyle(element);
    const parentStyle = element.parentElement ? getComputedStyle(element.parentElement) : null;
    const classes = classListOf(element);
    for (const property of properties) {
      const candidate = ownValue(element, property, style, parentStyle, classes);
      if (candidate && wanted(candidate, query, value)) candidates.push(candidate);
      if (candidates.length >= STYLE_SCAN_MAX_HITS) return { candidates, truncated: true };
    }
  }
  return { candidates, truncated: false };
}

async function sourcesOf(elements: Element[]): Promise<Map<Element, SourceLoc | null>> {
  const out = new Map<Element, SourceLoc | null>();
  const pending: Element[] = [];
  for (const element of elements) {
    const own = element.getAttribute(SOURCE_LOC_ATTR);
    out.set(element, parseLoc(own));
    if (!own && APP_LOOKUPS && pending.length < MAX_APP_LOOKUPS) pending.push(element);
  }
  await Promise.all(
    pending.map(async (element) => {
      const raw = await appSourceFor(element);
      if (raw && element.getAttribute(SOURCE_LOC_ATTR) === raw) out.set(element, parseLoc(raw));
    }),
  );
  return out;
}

function repeatCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const element of Array.from(document.querySelectorAll(`[${SOURCE_LOC_ATTR}]`))) {
    const loc = element.getAttribute(SOURCE_LOC_ATTR) ?? '';
    counts.set(loc, (counts.get(loc) ?? 0) + 1);
  }
  return counts;
}

export async function scanStyles(query: StyleQuery, selectorOf: SelectorOf): Promise<StyleScanResult & { elementsFound: Element[] }> {
  const value = query.value ? normalizeValue(query.value, query.property) : null;
  const { candidates, truncated } = collect(query, value);
  const elementsFound = [...new Set(candidates.map((candidate) => candidate.element))];
  const sources = await sourcesOf(elementsFound);
  const repeats = repeatCounts();
  const selectors = new Map(elementsFound.map((element) => [element, selectorOf(element)]));
  const hits: StyleHit[] = candidates.map((candidate) => {
    const source = sources.get(candidate.element) ?? null;
    const raw = candidate.element.getAttribute(SOURCE_LOC_ATTR) ?? '';
    return {
      selector: selectors.get(candidate.element) ?? '',
      tag: candidate.element.tagName.toLowerCase(),
      source,
      property: candidate.property,
      value: candidate.value,
      cls: candidate.cls,
      inline: candidate.inline,
      repeats: source ? Math.max(1, repeats.get(raw) ?? 1) : 1,
    };
  });
  return { hits, elements: elementsFound.length, truncated, value, elementsFound };
}

export interface FindStylesPorts {
  selectorOf: SelectorOf;
  select: (element: Element, additive: boolean) => void;
  reply: (requestId: string, result: StyleScanResult, selected: number) => void;
}

function selectAll(elements: Element[], select: FindStylesPorts['select']): number {
  const picked = elements.slice(0, STYLE_SELECT_MAX);
  picked.forEach((element, index) => select(element, index > 0));
  picked[0]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return picked.length;
}

export function findStyles(message: { requestId: unknown; query: unknown; select?: unknown }, ports: FindStylesPorts): void {
  if (typeof message.requestId !== 'string' || typeof message.query !== 'object' || message.query === null) return;
  const requestId = message.requestId;
  void scanStyles(message.query as StyleQuery, ports.selectorOf).then(({ elementsFound, ...result }) => {
    const selected = message.select === true ? selectAll(elementsFound, ports.select) : 0;
    ports.reply(requestId, result, selected);
  });
}

export function exposeHeadlessScan(selectorOf: SelectorOf): void {
  (window as unknown as Record<string, unknown>).__studioStyleScan = async (query: StyleQuery) => {
    const { elementsFound: _elements, ...result } = await scanStyles(query, selectorOf);
    return result;
  };
}
