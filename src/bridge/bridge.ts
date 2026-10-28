import type { AnchorQuery, AnchorReport, BridgeToParent, ParentToBridge, SelectionContext, SourceLoc } from '../shared/contracts.js';
import { forwardHistoryKeys } from './history-key.js';
import { resolveAnchor, type AnchorDom } from '../shared/comments.js';
import { TWEAKS_PREVIEW_STYLE_ID } from '../shared/tweaks.js';
import { LOFI_STYLE_ID } from '../shared/lofi.js';
import { AUTHORED_MAX_BYTES, ancestorPath, authoredRules } from './authored.js';
import { createLayerIndex, moveSelection } from './layers.js';
import { exposeHeadlessScan, findStyles } from './style-scan.js';
import { elementBySource } from './reorder.js';
import { reorderMoveOf } from '../shared/reorder.js';
import { structureKeyOf } from '../shared/structure-keys.js';
import { createForceState, type ForcedState } from './force-state.js';
import { isLayoutKey, layoutStyles } from './inlineStyle.js';
import { createTextEditor } from './text-edit.js';
import { createLinkBridge } from './play.js';
import { USED_AT_ATTR, appElementBySource, appHydrated, appSourceFor, appSourceMode, componentUseOf } from './app-source.js';
import { componentOwners } from './component-owner.js';
import { APP_REDIRECT_PARAM } from '../shared/app.js';
import {
  BRIDGE_CHANGES_PATH,
  BRIDGE_PARENT_ORIGIN_PARAM,
  BRIDGE_PASSIVE_PARAM,
  ELEMENT_MARK_PARAM,
  BRIDGE_TOKEN_PARAM,
  DIRECT_STYLE_PROPERTIES,
  SOURCE_LOC_ATTR,
  TOKEN_PREVIEW_STYLE_ID,
  zoomKeyOf,
  isModZoomKey,
  selectMoveOf,
  appKeyOf,
} from '../shared/contracts.js';

type Rect = SelectionContext['rect'];
type OutgoingBody = BridgeToParent extends infer Message
  ? Message extends BridgeToParent
    ? Omit<Message, 'ns' | 'token'>
    : never
  : never;

const STORAGE_PREFIX = '__studio_bridge:';
const STYLE_KEYS = [
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'padding',
  'margin',
  'border-radius',
  'display',
  'gap',
  'width',
  'height',
  'text-align',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-self',
  'flex',
  'box-shadow',
  'filter',
  'font-style',
  'text-decoration-line',
  'text-transform',
  'overflow',
  'text-shadow',
  'transform',
  'opacity',
  'border-width',
  'border-style',
  'border-color',
];
const MAX_SELECTOR_DEPTH = 8;
const MAX_ANCESTORS = 5;
const MAX_TEXT = 300;
const MAX_HTML = 3000;
const SELECT_SETTLE_MS = 400;

interface BridgeSession {
  token: string;
  parentOrigin: string;
}

function storageKey(): string {
  return `${STORAGE_PREFIX}${window.location.pathname}`;
}

function isBridgeSession(value: unknown): value is BridgeSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as BridgeSession).token === 'string' &&
    typeof (value as BridgeSession).parentOrigin === 'string'
  );
}

function rememberSession(session: BridgeSession): void {
  try {
    window.sessionStorage.setItem(storageKey(), JSON.stringify(session));
  } catch {
    return;
  }
}

const APP_MODE = appSourceMode();
const SELECT_RETRIES = 20;
const SELECT_RETRY_MS = 250;
const REDIRECTED_FROM = new URL(window.location.href).searchParams.get(APP_REDIRECT_PARAM);

function stripBridgeParams(url: URL): void {
  url.searchParams.delete(BRIDGE_TOKEN_PARAM);
  url.searchParams.delete(BRIDGE_PARENT_ORIGIN_PARAM);
  url.searchParams.delete(APP_REDIRECT_PARAM);
  try {
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    return;
  }
}

function storedSession(): BridgeSession | null {
  try {
    const stored = window.sessionStorage.getItem(storageKey());
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isBridgeSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readSession(): BridgeSession | null {
  const url = new URL(window.location.href);
  const token = url.searchParams.get(BRIDGE_TOKEN_PARAM);
  const parentOrigin = url.searchParams.get(BRIDGE_PARENT_ORIGIN_PARAM);
  if (!token || !parentOrigin) return storedSession();
  const session = { token, parentOrigin };
  if (url.searchParams.has(BRIDGE_PASSIVE_PARAM)) return session;
  rememberSession(session);
  stripBridgeParams(url);
  return session;
}

function rectOf(element: Element): Rect {
  const box = element.getBoundingClientRect();
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

function shortLabel(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const firstClass = (element.getAttribute('class') ?? '').trim().split(/\s+/)[0];
  return firstClass ? `${tag}.${firstClass}` : tag;
}

function uniqueId(element: Element): string | null {
  const id = element.id;
  if (!id) return null;
  const selector = `#${CSS.escape(id)}`;
  try {
    return document.querySelectorAll(selector).length === 1 ? selector : null;
  } catch {
    return null;
  }
}

function nthOfType(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;
  if (!parent) return tag;
  let index = 0;
  let count = 0;
  for (const sibling of Array.from(parent.children)) {
    if (sibling.tagName === element.tagName) {
      count += 1;
      if (sibling === element) index = count;
    }
  }
  return count > 1 ? `${tag}:nth-of-type(${index})` : tag;
}

const IS_MAC = /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

function selectorFor(element: Element): string {
  const own = uniqueId(element);
  if (own) return own;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body && current !== document.documentElement) {
    if (parts.length >= MAX_SELECTOR_DEPTH) break;
    const id = parts.length > 0 ? uniqueId(current) : null;
    if (id) {
      parts.unshift(id);
      return parts.join(' > ');
    }
    parts.unshift(nthOfType(current));
    current = current.parentElement;
  }
  if (current === document.body) parts.unshift('body');
  if (parts.length === 0) return element.tagName.toLowerCase();
  return parts.join(' > ');
}

function parseLoc(value: string): SourceLoc | null {
  const match = /^(.*):(\d+):(\d+)$/.exec(value);
  if (!match || !match[1] || !match[2] || !match[3]) return null;
  return { file: match[1], line: Number(match[2]), col: Number(match[3]) };
}

function sourceOf(element: Element): SourceLoc | null {
  const owner = APP_MODE === 'next' ? element : element.closest(`[${SOURCE_LOC_ATTR}]`);
  const value = owner?.getAttribute(SOURCE_LOC_ATTR);
  return value ? parseLoc(value) : null;
}

function usedAtOf(element: Element): SourceLoc | null {
  const value = element.getAttribute(USED_AT_ATTR);
  return value ? parseLoc(value) : null;
}

function stylesOf(element: Element): Record<string, string> {
  const computed = window.getComputedStyle(element);
  const styles: Record<string, string> = {};
  for (const key of STYLE_KEYS) styles[key] = computed.getPropertyValue(key);
  return { ...styles, ...layoutStyles(element, computed) };
}

function ancestorsOf(element: Element): string[] {
  const labels: string[] = [];
  let current = element.parentElement;
  while (current && labels.length < MAX_ANCESTORS) {
    labels.push(shortLabel(current));
    if (current === document.body) break;
    current = current.parentElement;
  }
  return labels;
}

function textOf(element: Element): string {
  const raw = element instanceof HTMLElement ? element.innerText : (element.textContent ?? '');
  return raw.trim().slice(0, MAX_TEXT);
}

function selectionFor(element: Element): SelectionContext {
  return {
    selector: selectorFor(element),
    tag: element.tagName.toLowerCase(),
    text: textOf(element),
    outerHTML: element.outerHTML.slice(0, MAX_HTML),
    styles: stylesOf(element),
    rect: rectOf(element),
    source: sourceOf(element),
    ...(APP_MODE === 'next' ? { usedAt: usedAtOf(element), usedBy: componentUseOf(element) } : {}),
    owners: componentOwners(element),
    ancestors: ancestorsOf(element),
  };
}

function stringifyArg(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function eventElement(event: Event): Element | null {
  const target = event.composedPath()[0] ?? event.target;
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isTypingElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}

function isEditKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat;
}

function reloadIfChangedDuringLoad(): void {
  if (!document.querySelector('script[src="/@vite/client"]')) return;
  const loadStartedAt = performance.timeOrigin;
  fetch(BRIDGE_CHANGES_PATH, { cache: 'no-store' })
    .then((res) => (res.ok ? (res.json() as Promise<{ changedAt?: unknown }>) : null))
    .then((body) => {
      if (body && typeof body.changedAt === 'number' && body.changedAt >= loadStartedAt) window.location.reload();
    })
    .catch(() => undefined);
}

type WheelBody = Extract<OutgoingBody, { type: 'wheel' }>;

function forwardZoomInput(post: (body: OutgoingBody) => void): void {
  let pending: WheelBody | null = null;
  let frame = 0;

  const flush = (): void => {
    frame = 0;
    const body = pending;
    pending = null;
    if (body) post(body);
  };

  const onWheel = (event: WheelEvent): void => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    if (pending && pending.deltaMode !== event.deltaMode) flush();
    pending = {
      type: 'wheel',
      deltaX: (pending?.deltaX ?? 0) + event.deltaX,
      deltaY: (pending?.deltaY ?? 0) + event.deltaY,
      deltaMode: event.deltaMode,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    if (!frame) frame = window.requestAnimationFrame(flush);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const app = event.repeat ? null : appKeyOf(event, isTypingElement(eventElement(event)));
    if (app) {
      event.preventDefault();
      post({ type: 'app-key', id: app });
      return;
    }
    if (event.key === 'Escape' && !event.repeat) post({ type: 'escape' });
    if (isLayoutKey(event) && !isTypingElement(eventElement(event))) {
      event.preventDefault();
      post({ type: 'layout-key' });
      return;
    }
    const key = zoomKeyOf(event);
    if (!key) return;
    const mod = isModZoomKey(event);
    if (!mod && isTypingElement(eventElement(event))) return;
    event.preventDefault();
    post({ type: 'zoom-key', key, at: performance.timeOrigin + performance.now() });
  };

  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
  window.addEventListener('keydown', onKeyDown, { capture: true });
}

type StyledElement = HTMLElement | SVGElement;

interface StyleBackup {
  hadAttribute: boolean;
  attribute: string | null;
  props: Map<string, { value: string; priority: string }>;
}

interface LivePreview {
  previewStyle(selector: unknown, style: unknown): void;
  previewText(selector: unknown, text: unknown): void;
  reset(): void;
  authoredInline(element: Element): string;
}

const PREVIEW_STYLE_KEYS = new Set<string>(DIRECT_STYLE_PROPERTIES);
const MAX_PREVIEW_VALUE = 200;
const MAX_PREVIEW_TEXT = 5000;
const NON_TEXT_TAGS = new Set(['script', 'style', 'template', 'iframe', 'textarea', 'img', 'input', 'br', 'hr', 'svg']);

function queryPreviewTarget(selector: unknown): Element | null {
  if (typeof selector !== 'string' || selector === '') return null;
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function isStyledElement(element: Element | null): element is StyledElement {
  return element instanceof HTMLElement || element instanceof SVGElement;
}

function isPreviewValue(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length <= MAX_PREVIEW_VALUE);
}

function previewEntries(style: unknown): [string, string | null][] {
  if (typeof style !== 'object' || style === null || Array.isArray(style)) return [];
  return Object.entries(style as Record<string, unknown>).filter(
    (entry): entry is [string, string | null] => PREVIEW_STYLE_KEYS.has(entry[0]) && isPreviewValue(entry[1]),
  );
}

function restoreStyle(element: StyledElement, backup: StyleBackup): void {
  for (const [prop, original] of backup.props) {
    if (original.value === '') element.style.removeProperty(prop);
    else element.style.setProperty(prop, original.value, original.priority);
  }
  if (!backup.hadAttribute && element.getAttribute('style') === '') element.removeAttribute('style');
}

function createLivePreview(): LivePreview {
  const styleBackups = new Map<StyledElement, StyleBackup>();
  const textBackups = new Map<Element, Node[]>();

  const backupFor = (element: StyledElement): StyleBackup => {
    const existing = styleBackups.get(element);
    if (existing) return existing;
    const created: StyleBackup = { hadAttribute: element.hasAttribute('style'), attribute: element.getAttribute('style'), props: new Map() };
    styleBackups.set(element, created);
    return created;
  };

  const previewStyle = (selector: unknown, style: unknown): void => {
    const element = queryPreviewTarget(selector);
    if (!isStyledElement(element)) return;
    const entries = previewEntries(style);
    if (entries.length === 0) return;
    const backup = backupFor(element);
    for (const [prop, value] of entries) {
      if (!backup.props.has(prop)) {
        backup.props.set(prop, { value: element.style.getPropertyValue(prop), priority: element.style.getPropertyPriority(prop) });
      }
      if (value === null) element.style.removeProperty(prop);
      else element.style.setProperty(prop, value);
    }
  };

  const previewText = (selector: unknown, text: unknown): void => {
    const element = queryPreviewTarget(selector);
    if (!element || typeof text !== 'string' || text.length > MAX_PREVIEW_TEXT) return;
    if (NON_TEXT_TAGS.has(element.tagName.toLowerCase())) return;
    if (!textBackups.has(element)) {
      if (element.children.length > 0) return;
      textBackups.set(element, [...element.childNodes]);
    }
    element.textContent = text;
  };

  const reset = (): void => {
    for (const [element, nodes] of textBackups) element.replaceChildren(...nodes);
    for (const [element, backup] of styleBackups) restoreStyle(element, backup);
    textBackups.clear();
    styleBackups.clear();
  };

  const authoredInline = (element: Element): string => {
    const backup = isStyledElement(element) ? styleBackups.get(element) : undefined;
    return (backup ? backup.attribute : element.getAttribute('style')) ?? '';
  };

  return { previewStyle, previewText, reset, authoredInline };
}

const MAX_TOKEN_PREVIEW_CSS = 200_000;

type PreviewLayer = 'tokens' | 'tweaks' | 'lofi';

const PREVIEW_LAYERS: { layer: PreviewLayer; id: string }[] = [
  { layer: 'tokens', id: TOKEN_PREVIEW_STYLE_ID },
  { layer: 'tweaks', id: TWEAKS_PREVIEW_STYLE_ID },
  { layer: 'lofi', id: LOFI_STYLE_ID },
];

interface PreviewStyles {
  apply(layer: PreviewLayer, css: unknown): void;
}

function createPreviewStyles(): PreviewStyles {
  const active: Record<PreviewLayer, string> = { tokens: '', tweaks: '', lofi: '' };
  let observer: MutationObserver | null = null;

  const element = (id: string): HTMLStyleElement | null => {
    const found = document.getElementById(id);
    return found instanceof HTMLStyleElement ? found : null;
  };

  const wanted = () => PREVIEW_LAYERS.filter((item) => active[item.layer] !== '');

  const inOrder = (): boolean => {
    const items = wanted();
    let node = document.head.lastElementChild;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      if (!item || !(node instanceof HTMLStyleElement) || node.id !== item.id || node.textContent !== active[item.layer]) return false;
      node = node.previousElementSibling;
    }
    return true;
  };

  const ensureOrder = (): void => {
    if (inOrder()) return;
    const head = document.head;
    for (const item of wanted()) {
      let style = element(item.id);
      if (!style) {
        style = document.createElement('style');
        style.id = item.id;
      }
      if (style.textContent !== active[item.layer]) style.textContent = active[item.layer];
      head.appendChild(style);
    }
  };

  const watch = (): void => {
    if (observer || typeof MutationObserver !== 'function') return;
    observer = new MutationObserver(() => ensureOrder());
    observer.observe(document.head, { childList: true });
  };

  const apply = (layer: PreviewLayer, css: unknown): void => {
    if (typeof css !== 'string' || css.length > MAX_TOKEN_PREVIEW_CSS) return;
    active[layer] = css;
    if (!css) element(PREVIEW_LAYERS.find((item) => item.layer === layer)?.id ?? '')?.remove();
    if (wanted().length === 0) {
      observer?.disconnect();
      observer = null;
      return;
    }
    ensureOrder();
    watch();
  };

  return { apply };
}

interface ThemeControl {
  set(theme: unknown): void;
}

function createThemeControl(): ThemeControl {
  let original: { theme: string | undefined; dark: boolean } | null = null;

  const restore = (): void => {
    if (!original) return;
    const root = document.documentElement;
    if (original.theme === undefined) delete root.dataset.theme;
    else root.dataset.theme = original.theme;
    root.classList.toggle('dark', original.dark);
    if (root.getAttribute('class') === '') root.removeAttribute('class');
    original = null;
  };

  const set = (theme: unknown): void => {
    if (theme === null) {
      restore();
      return;
    }
    if (theme !== 'light' && theme !== 'dark') return;
    const root = document.documentElement;
    original ??= { theme: root.dataset.theme, dark: root.classList.contains('dark') };
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
  };

  return { set };
}

function queryElement(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function sameElements(a: (Element | null)[], b: (Element | null)[]): boolean {
  return a.length === b.length && a.every((element, index) => element === b[index]);
}

interface RectTracker {
  track(selectors: string[]): void;
  schedule(): void;
}

function createRectTracker(post: (body: OutgoingBody) => void): RectTracker {
  let selectors: string[] = [];
  let observed: (Element | null)[] = [];
  let frame = 0;
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule()) : null;

  const observe = (elements: (Element | null)[]): void => {
    if (!observer || sameElements(elements, observed)) return;
    observed = elements;
    observer.disconnect();
    if (elements.length === 0) return;
    observer.observe(document.documentElement);
    for (const element of elements) if (element) observer.observe(element);
  };

  const send = (): void => {
    frame = 0;
    if (selectors.length === 0) return;
    const elements = selectors.map(queryElement);
    observe(elements);
    post({ type: 'rects', selectors, rects: elements.map((element) => (element ? rectOf(element) : null)) });
  };

  function schedule(): void {
    if (selectors.length === 0 || frame) return;
    frame = window.requestAnimationFrame(send);
  }

  const track = (next: string[]): void => {
    selectors = next;
    if (frame) window.cancelAnimationFrame(frame);
    if (next.length === 0) {
      frame = 0;
      observe([]);
      return;
    }
    send();
  };

  return { track, schedule };
}

const MAX_ANCHORS = 200;

const anchorDom: AnchorDom<Element> = {
  bySource: (loc) => Array.from(document.querySelectorAll(`[${SOURCE_LOC_ATTR}]`)).filter((element) => element.getAttribute(SOURCE_LOC_ATTR) === loc),
  bySelector: (selector) => queryElement(selector),
  byTag: (tag) => (/^[a-z][a-z0-9-]*$/i.test(tag) ? Array.from(document.getElementsByTagName(tag)) : []),
  tagOf: (element) => element.tagName.toLowerCase(),
  textOf: (element) => (element instanceof HTMLElement ? element.innerText : (element.textContent ?? '')),
};

function isAnchorQuery(value: unknown): value is AnchorQuery {
  if (typeof value !== 'object' || value === null) return false;
  const query = value as Partial<AnchorQuery>;
  return (
    typeof query.id === 'string' &&
    typeof query.selector === 'string' &&
    typeof query.tag === 'string' &&
    typeof query.textSnippet === 'string' &&
    (query.sourceLoc === null || typeof query.sourceLoc === 'string')
  );
}

function anchorQueries(raw: unknown): AnchorQuery[] {
  return Array.isArray(raw) ? raw.filter(isAnchorQuery).slice(0, MAX_ANCHORS) : [];
}

function resolveAnchorElement(query: AnchorQuery): { element: Element; report: AnchorReport } | null {
  const found = resolveAnchor(query, anchorDom);
  if (!found) return null;
  const report: AnchorReport = {
    id: query.id,
    rect: rectOf(found.element),
    via: found.via,
    selector: selectorFor(found.element),
    sourceLoc: found.element.getAttribute(SOURCE_LOC_ATTR),
  };
  return { element: found.element, report };
}

interface AnchorTracker {
  track(queries: AnchorQuery[]): void;
  schedule(): void;
}

function createAnchorTracker(post: (body: OutgoingBody) => void): AnchorTracker {
  let queries: AnchorQuery[] = [];
  let observed: (Element | null)[] = [];
  let frame = 0;
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule()) : null;

  const observe = (elements: (Element | null)[]): void => {
    if (!observer || sameElements(elements, observed)) return;
    observed = elements;
    observer.disconnect();
    if (elements.length === 0) return;
    observer.observe(document.documentElement);
    for (const element of elements) if (element) observer.observe(element);
  };

  const send = (): void => {
    frame = 0;
    const resolved = queries.map(resolveAnchorElement);
    observe(resolved.map((entry) => entry?.element ?? null));
    post({
      type: 'anchor-rects',
      anchors: resolved.map((entry, index) => entry?.report ?? { id: queries[index]?.id ?? '', rect: null, via: null }),
    });
  };

  function schedule(): void {
    if (queries.length === 0 || frame) return;
    frame = window.requestAnimationFrame(send);
  }

  const track = (next: AnchorQuery[]): void => {
    queries = next;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    if (next.length === 0) {
      observe([]);
      post({ type: 'anchor-rects', anchors: [] });
      return;
    }
    send();
  };

  return { track, schedule };
}

function startBridge(session: BridgeSession): void {
  const parentWindow = window.parent;
  let mode: 'select' | 'none' = 'none';
  let hoverFrame = 0;
  let pendingHover: Element | null = null;
  let lastHover: Element | null = null;
  let scrollFrame = 0;
  let reporting = false;

  const post = (body: OutgoingBody): void => {
    try {
      parentWindow.postMessage({ ...body, ns: 'studio', token: session.token }, session.parentOrigin);
    } catch {
      void 0;
    }
  };

  const reportError = (body: Extract<OutgoingBody, { type: 'error' }>): void => {
    if (reporting) return;
    reporting = true;
    try {
      post(body);
    } finally {
      reporting = false;
    }
  };

  window.addEventListener('error', (event: ErrorEvent) => {
    const error: unknown = event.error;
    reportError({
      type: 'error',
      kind: 'runtime',
      message: event.message || stringifyArg(error),
      stack: error instanceof Error ? error.stack : undefined,
      source: event.filename || undefined,
      line: event.lineno || undefined,
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason: unknown = event.reason;
    reportError({
      type: 'error',
      kind: 'unhandledrejection',
      message: stringifyArg(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]): void => {
    originalConsoleError(...args);
    const firstError = args.find((arg): arg is Error => arg instanceof Error);
    reportError({
      type: 'error',
      kind: 'console',
      message: args.map(stringifyArg).join(' '),
      stack: firstError?.stack,
    });
  };

  const layers = createLayerIndex();
  let selected: Element | null = null;
  let selectedAt = -Infinity;
  let altHeld = false;
  let lastAlt = false;

  const postHover = (element: Element | null, source?: 'tree'): void => {
    if (!element) {
      post({ type: 'hover', rect: null, source });
      return;
    }
    post({ type: 'hover', rect: rectOf(element), label: shortLabel(element), altKey: altHeld, node: layers.idOf(element), source });
  };

  const flushHover = (): void => {
    hoverFrame = 0;
    const element = pendingHover;
    pendingHover = null;
    if (mode !== 'select') return;
    if (element === lastHover && element && altHeld === lastAlt) return;
    lastHover = element;
    lastAlt = altHeld;
    postHover(element);
    if (element && APP_MODE === 'next') void appSourceFor(element);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (mode !== 'select' || textEditor.editing()) return;
    altHeld = event.altKey;
    pendingHover = eventElement(event);
    if (!hoverFrame) hoverFrame = window.requestAnimationFrame(flushHover);
  };

  const block = (event: Event): void => {
    if (textEditor.owns(eventElement(event))) {
      event.stopImmediatePropagation();
      return;
    }
    if (event.type === 'pointerdown') textEditor.commit();
    if (mode !== 'select') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  const lookUpAppSource = (element: Element, additive: boolean): void => {
    if (APP_MODE !== 'next' || element.hasAttribute(SOURCE_LOC_ATTR)) return;
    void appSourceFor(element).then((source) => {
      if (source && selected === element) postSelect(element, additive);
    });
  };

  const postSelect = (element: Element, additive: boolean): void => {
    lookUpAppSource(element, additive);
    selected = element;
    selectedAt = performance.now();
    post({
      type: 'select',
      selection: { ...selectionFor(element), path: ancestorPath(element) },
      additive,
      at: performance.timeOrigin + performance.now(),
      node: layers.idOf(element),
    });
  };

  const onClick = (event: MouseEvent): void => {
    if (mode !== 'select' && links.onClick(event)) return;
    if (mode !== 'select' || textEditor.owns(eventElement(event))) return block(event);
    block(event);
    const element = eventElement(event);
    if (!element) return;
    postSelect(element, event.shiftKey);
  };

  const onContextMenu = (event: MouseEvent): void => {
    block(event);
    const element = eventElement(event);
    if (mode !== 'select' || !element || textEditor.owns(element)) return;
    if (element !== selected) postSelect(element, false);
    post({ type: 'context-menu', x: event.clientX, y: event.clientY });
  };

  const onAltChange = (event: KeyboardEvent): void => {
    if (event.key !== 'Alt' || mode !== 'select') return;
    altHeld = event.type === 'keydown';
    if (altHeld === lastAlt || !lastHover) return;
    lastAlt = altHeld;
    postHover(lastHover);
  };

  const onDblClick = (event: MouseEvent): void => {
    const element = eventElement(event);
    const target = mode === 'select' || element === selected ? element : null;
    if (textEditor.owns(element) || !textEditor.canEdit(target)) return block(event);
    event.preventDefault();
    event.stopImmediatePropagation();
    textEditor.start(target, { x: event.clientX, y: event.clientY });
  };

  const forwardStructureKey = (event: KeyboardEvent): boolean => {
    const key = event.repeat ? null : structureKeyOf(event, IS_MAC);
    if (!key || !selected?.isConnected || isTypingElement(eventElement(event))) return false;
    event.preventDefault();
    event.stopPropagation();
    post({ type: 'structure-key', selector: selectorFor(selected), key });
    return true;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (textEditor.onKeyDown(event)) return;
    if (mode !== 'select' && links.onKeyDown(event)) return;
    onAltChange(event);
    const reorder = reorderMoveOf(event);
    if (reorder && selected?.isConnected && !isTypingElement(eventElement(event))) {
      event.preventDefault();
      event.stopPropagation();
      post({ type: 'reorder-key', selector: selectorFor(selected), move: reorder });
      return;
    }
    if (mode !== 'select' || forwardStructureKey(event)) return;
    if (isEditKey(event) && textEditor.canEdit(selected) && !isTypingElement(eventElement(event))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      textEditor.start(selected);
      return;
    }
    const move = selectMoveOf(event);
    if (move && selected?.isConnected && !isTypingElement(eventElement(event))) {
      event.preventDefault();
      event.stopPropagation();
      const next = moveSelection(selected, move);
      if (next) postSelect(next, false);
      return;
    }
    if (event.key !== 'Escape') return;
    mode = 'none';
    lastHover = null;
    pendingHover = null;
    post({ type: 'hover', rect: null });
    post({ type: 'mode-exited' });
  };

  const onScroll = (): void => {
    anchors.schedule();
    links.schedule();
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      post({ type: 'scroll' });
    });
  };

  const rects = createRectTracker(post);
  const anchors = createAnchorTracker(post);
  const links = createLinkBridge(post);
  const livePreview = createLivePreview();
  const textEditor = createTextEditor({
    post,
    selectorFor,
    previewText: (selector, text) => livePreview.previewText(selector, text),
    onStart: (element) => {
      lastHover = null;
      pendingHover = null;
      post({ type: 'hover', rect: null });
      if (selected !== element) postSelect(element, false);
    },
  });
  const previewStyles = createPreviewStyles();
  const themeControl = createThemeControl();
  let forcedDark = false;
  const repostSelected = (): void => {
    if (selected?.isConnected) postSelect(selected, false);
  };
  const forceState = createForceState(repostSelected);
  const onForceState = (message: Extract<ParentToBridge, { type: 'force-state' }>): void => {
    const states = (Array.isArray(message.states) ? message.states : []).filter((state): state is ForcedState => state === 'hover' || state === 'focus' || state === 'active');
    const selector = typeof message.selector === 'string' && message.selector.length <= 2000 ? message.selector : null;
    const dark = message.dark === true && selector !== null;
    if (dark !== forcedDark) themeControl.set(dark ? 'dark' : null);
    forcedDark = dark;
    forceState.set(selector, states, dark, message.track === true);
    if (selector && !selected?.isConnected) selected = queryElement(selector);
    window.requestAnimationFrame(() => window.requestAnimationFrame(repostSelected));
  };
  const messageHandlers: { [Type in ParentToBridge['type']]: (message: Extract<ParentToBridge, { type: Type }>) => void } = {
    'set-mode': (message) => {
      mode = message.mode === 'select' ? 'select' : 'none';
      lastHover = null;
      pendingHover = null;
    },
    'request-rects': (message) => {
      const selectors = (Array.isArray(message.selectors) ? message.selectors : []).filter((selector): selector is string => typeof selector === 'string');
      const last = selectors.at(-1);
      if (!last) selected = null;
      else if (performance.now() - selectedAt > SELECT_SETTLE_MS) selected = queryElement(last);
      rects.track(selectors);
    },
    clear: () => {
      lastHover = null;
      pendingHover = null;
    },
    'preview-style': (message) => livePreview.previewStyle(message.selector, message.style),
    'preview-text': (message) => livePreview.previewText(message.selector, message.text),
    'preview-reset': () => livePreview.reset(),
    'tokens-preview': (message) => previewStyles.apply('tokens', message.css),
    'tweaks-preview': (message) => previewStyles.apply('tweaks', message.css),
    'lofi-preview': (message) => previewStyles.apply('lofi', message.css),
    'set-theme': (message) => themeControl.set(message.theme),
    'force-state': onForceState,
    'track-anchors': (message) => anchors.track(anchorQueries(message.anchors)),
    'track-links': (message) => links.track(message.links),
    'play-links': (message) => links.play(message.links),
    'request-tree': () => post({ type: 'tree', ...layers.build() }),
    'hover-node': (message) => postHover(typeof message.id === 'number' ? layers.element(message.id) : null, 'tree'),
    'select-node': (message) => {
      const element = typeof message.id === 'number' ? layers.element(message.id) : null;
      if (element) postSelect(element, message.additive === true);
    },
    'select-relative': (message) => {
      const base = selected?.isConnected ? selected : typeof message.selector === 'string' ? queryElement(message.selector) : null;
      if (message.move === 'child' && textEditor.canEdit(base)) return textEditor.start(base);
      const valid = message.move === 'child' || message.move === 'parent' || message.move === 'next' || message.move === 'prev';
      const next = base && valid ? moveSelection(base, message.move) : null;
      if (next) postSelect(next, false);
    },
    'request-authored': (message) => {
      if (typeof message.requestId !== 'string' || typeof message.selector !== 'string') return;
      const element = queryElement(message.selector);
      const rules = element ? authoredRules(element) : [];
      post({ type: 'authored', requestId: message.requestId, rules, inline: element ? livePreview.authoredInline(element).slice(0, AUTHORED_MAX_BYTES) : '' });
    },
    'select-selector': (message) => {
      const selector = message.selector;
      if (typeof selector !== 'string' || selector.length > 400) return;
      const attempt = (left: number): void => {
        let element: Element | null = null;
        try {
          element = document.querySelector(selector);
        } catch {
          return;
        }
        const ready = element && (APP_MODE !== 'next' || appHydrated(element));
        if (element && (ready || left === 0)) {
          element.scrollIntoView({ block: 'center', inline: 'nearest' });
          postSelect(element, false);
        } else if (left > 0 && APP_MODE === 'next') window.setTimeout(() => attempt(left - 1), SELECT_RETRY_MS);
      };
      attempt(SELECT_RETRIES);
    },
    'find-styles': (message) => findStyles(message, { selectorOf: selectorFor, select: postSelect, reply: (requestId, result, selected) => post({ type: 'styles-found', requestId, result, selected }) }),
    'select-source': (message) => {
      const element = elementBySource(message, textOf);
      if (element) postSelect(element, false);
      else if (APP_MODE === 'next' && typeof message.sourceLoc === 'string' && typeof message.tag === 'string') {
        void appElementBySource(message.sourceLoc, message.tag).then((found) => found && postSelect(found, false));
      }
    },
    'text-edit-allowed': (message) => textEditor.allow(message.allowed === true),
    'text-edit-stop': () => textEditor.cancel(),
    'describe-anchors': (message) => {
      if (typeof message.requestId !== 'string') return;
      const contexts = anchorQueries(message.anchors).map((query) => {
        const found = resolveAnchorElement(query);
        return found ? selectionFor(found.element) : null;
      });
      post({ type: 'anchor-contexts', requestId: message.requestId, contexts });
    },
  };

  const onMessage = (event: MessageEvent): void => {
    if (event.source !== parentWindow || event.origin !== session.parentOrigin) return;
    const data = event.data as Partial<ParentToBridge> | null;
    if (!data || typeof data !== 'object' || data.ns !== 'studio' || data.token !== session.token) return;
    const message = data as ParentToBridge;
    if (typeof message.type !== 'string' || !Object.hasOwn(messageHandlers, message.type)) return;
    const handler = messageHandlers[message.type] as (message: ParentToBridge) => void;
    handler(message);
  };

  window.addEventListener('message', onMessage);
  window.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
  window.addEventListener('pointerdown', block, { capture: true });
  window.addEventListener('mousedown', block, { capture: true });
  window.addEventListener('pointerup', block, { capture: true });
  window.addEventListener('mouseup', block, { capture: true });
  window.addEventListener('click', onClick, { capture: true });
  window.addEventListener('dblclick', onDblClick, { capture: true });
  window.addEventListener('auxclick', block, { capture: true });
  window.addEventListener('contextmenu', onContextMenu, { capture: true });
  window.addEventListener('keydown', onKeyDown, { capture: true });
  window.addEventListener('keyup', onAltChange, { capture: true });
  window.addEventListener('scroll', onScroll, { capture: true, passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  forwardZoomInput(post);
  forwardHistoryKeys(post);

  let paintScheduled = false;
  const schedulePainted = (): void => {
    forceState.schedule();
    rects.schedule();
    anchors.schedule();
    links.schedule();
    if (paintScheduled) return;
    paintScheduled = true;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        paintScheduled = false;
        post({ type: 'painted', at: performance.timeOrigin + performance.now() });
      });
    });
  };

  const announce = (): void => {
    reloadIfChangedDuringLoad();
    post({ type: 'ready', url: window.location.href, ...(REDIRECTED_FROM ? { redirectedFrom: REDIRECTED_FROM } : {}) });
    schedulePainted();
    new MutationObserver(schedulePainted).observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', announce, { once: true });
  } else {
    announce();
  }
}

function markScopedElement(): void {
  const loc = new URL(window.location.href).searchParams.get(ELEMENT_MARK_PARAM);
  if (!loc || document.getElementById('studio-element-mark')) return;
  const style = document.createElement('style');
  style.id = 'studio-element-mark';
  style.textContent = `[${SOURCE_LOC_ATTR}="${CSS.escape(loc)}"]{outline:2px solid oklch(0.62 0.19 255) !important;outline-offset:4px !important;}`;
  (document.head ?? document.documentElement).appendChild(style);
}

const marker = '__studioBridgeStarted';
const globalScope = window as unknown as Record<string, unknown>;
if (!globalScope[marker]) {
  globalScope[marker] = true;
  exposeHeadlessScan(selectorFor);
  markScopedElement();
  const session = readSession();
  if (session) startBridge(session);
}
