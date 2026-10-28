import { DEV_CHROME_SELECTOR } from '../shared/app.js';
import { MATCH_KINDS, MATCH_SELECT_MAX, SOURCE_LOC_ATTR, type MatchKind } from '../shared/contracts.js';
import { isLayer } from './layers.js';

const TEXT_KEYS = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform'];
const STACK_FRAMES = 4;

export interface MatchResult {
  elements: Element[];
  note?: string;
}

interface HostFiber {
  _debugStack?: { stack?: unknown } | null;
  _debugSource?: { fileName?: unknown; lineNumber?: unknown; columnNumber?: unknown } | null;
}

function fiberOf(element: Element): HostFiber | null {
  const key = Object.keys(element).find((name) => name.startsWith('__reactFiber$'));
  return key ? ((element as unknown as Record<string, HostFiber>)[key] ?? null) : null;
}

function jsxSite(element: Element): string | null {
  const fiber = fiberOf(element);
  const source = fiber?._debugSource;
  if (source && typeof source.fileName === 'string') return `${source.fileName}:${String(source.lineNumber)}:${String(source.columnNumber)}`;
  const stack = fiber?._debugStack?.stack;
  if (typeof stack !== 'string' || stack === '') return null;
  return stack.split('\n').slice(1, 1 + STACK_FRAMES).join('\n');
}

function componentKey(element: Element, useLoc: boolean): string | null {
  const loc = useLoc ? element.getAttribute(SOURCE_LOC_ATTR) : null;
  if (loc) return `loc:${loc}`;
  const site = jsxSite(element);
  return site ? `${element.tagName}|${site}` : null;
}

function classKey(element: Element): string | null {
  const classes = [...element.classList].sort();
  return classes.length > 0 ? classes.join(' ') : null;
}

function ownText(element: Element): boolean {
  return Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
}

function textKey(element: Element): string | null {
  if (!ownText(element)) return null;
  const computed = window.getComputedStyle(element);
  return TEXT_KEYS.map((key) => computed.getPropertyValue(key)).join('|');
}

function keyFor(by: MatchKind, useLoc: boolean): (element: Element) => string | null {
  if (by === 'classes') return classKey;
  if (by === 'text-style') return textKey;
  return (element) => componentKey(element, useLoc);
}

const MISSING: Record<MatchKind, string> = {
  component: 'This element has no component or source location to match.',
  classes: 'This element has no classes to match.',
  'text-style': 'This element has no text of its own, so it has no text style to match.',
};

function candidate(element: Element): boolean {
  return isLayer(element) && !element.matches(DEV_CHROME_SELECTOR) && element.getClientRects().length > 0;
}

export function matchingElements(base: Element, by: MatchKind, options: { useLoc: boolean; skip?: (element: Element) => boolean }): MatchResult {
  const key = keyFor(by, options.useLoc);
  const wanted = key(base);
  if (wanted === null) return { elements: [base], note: MISSING[by] };
  const elements: Element[] = [];
  let more = false;
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    if (element !== base && (!candidate(element) || options.skip?.(element) || key(element) !== wanted)) continue;
    if (elements.length >= MATCH_SELECT_MAX) {
      more = true;
      break;
    }
    elements.push(element);
  }
  return more ? { elements, note: `Selected the first ${MATCH_SELECT_MAX} matches.` } : { elements };
}

export function isMatchKind(value: unknown): value is MatchKind {
  return typeof value === 'string' && (MATCH_KINDS as readonly string[]).includes(value);
}

export function pathOf(element: Element): string {
  const parts: string[] = [];
  for (let node: Element | null = element; node?.parentElement && node !== document.body; node = node.parentElement) {
    parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${Array.prototype.indexOf.call(node.parentElement.children, node) + 1})`);
  }
  return ['body', ...parts].join(' > ');
}

export function exposeHeadlessMatch(useLoc: boolean): void {
  (window as unknown as Record<string, unknown>).__studioSelectMatching = (selector: string, by: MatchKind) => {
    let base: Element | null = null;
    try {
      base = document.querySelector(selector);
    } catch {
      return { found: false, paths: [] };
    }
    if (!base) return { found: false, paths: [] };
    const result = matchingElements(base, by, { useLoc });
    return { found: true, paths: result.elements.map(pathOf), ...(result.note ? { note: result.note } : {}) };
  };
}
